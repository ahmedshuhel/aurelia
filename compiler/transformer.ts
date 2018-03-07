import * as ts from 'typescript';
import { bindingMode, IAureliaModule, ITemplateFactory } from './interfaces'
import { AbstractBinding } from './binding';
import { getElementViewName } from './util';

export interface ModuleExportedElements {
  name: string
}

export class Transformer {

  static lifecycleMethods = {
    created: 'created',
    bind: 'bind',
    unbind: 'unbind',
    attach: 'attach',
    detach: 'detach'
  };

  observerPropName = '$observers';
  templatePropName = '$html';
  bindingPropName = '$bindings';
  elementAnchorPropName = '$anchor';
  elementViewPropName = '$view';
  elementScopePropName = '$scope';

  constructor(
    public templateFactory: ITemplateFactory,
    public resourceModule: IAureliaModule
  ) {

  }

  public context: ts.TransformationContext;
  public hasExportedElement: boolean = false;
  public exportedElements: ModuleExportedElements[] = [];

  private fileVisitor = (file: ts.SourceFile) => {
    file = ts.visitEachChild(file, this.nodeVisitor, this.context);
    let observedProperties = this.templateFactory.observedProperties;
    let exportedElements = this.resourceModule.getCustomElements().map((elResource, idx) => {
      // Only the first element class declaration uses the main template;
      if (idx === 0) {
        const viewClassName = getElementViewName(elResource.impl.name);
        return ts.createClassDeclaration(
          /* decorators */ undefined,
          /* modifiers */ undefined,
          viewClassName,
          /* type parameters */ undefined,
          /* heritage clauses */ undefined,
          /* members */
          [
            this.createViewClassConstructor(),
            this.createScopeProp(),
            // this.createObserverProp(observedProperties),
            this.createTemplateProp(),
            this.createInitMethod(viewClassName),
            // this.createBindingsProp(),
            ...this.createLifecycleMethods(),
            ...observedProperties.reduce((propDeclarations, op) => {
              return propDeclarations.concat([
                this.createObserverGetter(op),
                this.createObserverSetter(op)
              ]);
            }, /* observed properties init value */[]),
          ]
        );
      } else {
        let factories = []; // this.templateFactory.getTemplates();
        if (!factories || !factories.length) {
          return null;
        } else {
          throw new Error('Sub template in TemplateFactory not implemented.');
        }
      }
    }).filter(Boolean);
    return ts.updateSourceFileNode(file, [
      this.createImport(['createOverrideContext'], './framework/binding/scope'),
      this.createImport(['getAst'], './asts'),
      this.createImport(['Binding', 'TextBinding', 'Listener'], './framework/binding/binding'),
      this.createImport(['Observer'], './framework/binding/property-observation'),
      this.createImport(['Template'], './framework/templating/template'),
      ...exportedElements,
      ...file.statements
    ]);
  }

  private nodeVisitor = (node: ts.Node): ts.Node => {
    const visitor = `visit${ts.SyntaxKind[node.kind]}`;
    if (visitor in this) {
      return this[visitor](node);
    }
    return ts.visitEachChild(node, this.nodeVisitor, this.context);
  }

  transform = (context: ts.TransformationContext) => {
    this.context = context;
    return this.fileVisitor;
  }

  private isExportedClass(node: ts.Node): node is ts.ClassDeclaration & ts.ExportDeclaration {
    return node.kind === ts.SyntaxKind.ClassDeclaration
      && ((ts.getCombinedModifierFlags(node)
        | ts.ModifierFlags.Export) === ts.ModifierFlags.Export
      );
  }

  private isCustomElement(node: ts.Node): node is ts.ClassDeclaration & ts.ExportDeclaration {
    if (!this.isExportedClass(node)) {
      return false;
    }
    const name = node.name.escapedText.toString();
    if (name.endsWith('CustomElement')) {
      return true;
    }
    const decorators = node.decorators;
    if (!decorators) {
      return false;
    }
    return decorators.some(d => (d.expression as ts.Identifier).escapedText === 'customElement');
  }

  private createImport(names: string[], moduleName: string) {
    return ts.createImportDeclaration(
      /* decorators */undefined,
      /* modifiers */ undefined,
      ts.createImportClause(
        /* default */ undefined,
        ts.createNamedImports(names.map(n => ts.createImportSpecifier(
          /* propertyName */ undefined,
          /* target name */ ts.createIdentifier(n)
        )))
      ),
      ts.createLiteral(moduleName)
    );
  }

  // =============================
  // VIEW CLASS GENERATION
  // =============================

  private createViewClassConstructor() {
    return ts.createConstructor(
      /** decorators */ undefined,
      /** modifiers */ undefined,
      /** params */[],
      ts.createBlock([
        ts.createStatement(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createIdentifier('Object'),
              'defineProperty'
            ),
            /*typeArguments*/ undefined,
            /*arguments*/
            [
              ts.createThis(),
              ts.createLiteral(this.observerPropName),
              ts.createObjectLiteral(
                [
                  ts.createPropertyAssignment(
                    'value',
                    ts.createObjectLiteral(
                      this.templateFactory.observedProperties.map(op => ts.createPropertyAssignment(
                        op,
                        ts.createNew(
                          ts.createIdentifier('Observer'),
                          /* type arguments */ undefined,
                          /* arguments */ undefined
                        )
                      )),
                      /* multiline */ true
                    )
                  ),
                  ts.createPropertyAssignment('configurable', ts.createTrue())
                ],
                /*multiline*/ true
              )
            ]
          ),
        )
      ], /*multiline*/ true)
    );
  }

  private createObserverProp(observedProperties: string[]) {
    return ts.createProperty(
      /* decorators */ undefined,
      /* modifiers */ undefined,
      this.observerPropName,
      /* question token */ undefined,
      /* type node */ undefined,
      ts.createObjectLiteral(
        observedProperties.map(op => ts.createPropertyAssignment(
          op,
          ts.createNew(
            ts.createIdentifier('Observer'),
            /* type arguments */ undefined,
            /* arguments */
            [
              ts.createLiteral('')
            ]
          )
        )),
        /* multiline */ true
      )
    );
  }

  private createScopeProp() {
    return ts.createProperty(
      /* decorators */ undefined,
      /* modifiers */ undefined,
      this.elementScopePropName,
      /* question token */ undefined,
      /* type node */ undefined,
      ts.createObjectLiteral(
        [
          ts.createPropertyAssignment(
            'bindingContext',
            ts.createThis()
          ),
          ts.createPropertyAssignment(
            'overrideContext',
            ts.createCall(
              ts.createIdentifier('createOverrideContext'),
              /*typeArguments*/ undefined,
              /*arguments*/
              [
                ts.createThis()
              ]
            )
          )
        ],
        /*multiline*/ true
      )
    );
  }

  private createTemplateProp() {
    return ts.createProperty(
      /* decorators */ undefined,
      [
        ts.createToken(ts.SyntaxKind.PublicKeyword),
        ts.createToken(ts.SyntaxKind.StaticKeyword)
      ],
      this.templatePropName,
      /* question token */ undefined,
      /* type node */ undefined,
      ts.createNew(
        ts.createIdentifier('Template'),
        /* type arguments */ undefined,
        /* arguments */
        [
          ts.createNoSubstitutionTemplateLiteral(this.templateFactory.html)
        ]
      )
    );
  }

  private createInitMethod(viewClassName: string) {
    return ts.createMethod(
      /* decorators */ undefined,
      /* modifiers */ undefined,
      /* asterisk token */ undefined,
      'applyTo',
      /* question token */ undefined,
      /* type params */ undefined,
      [
        ts.createParameter(
          /* decorators */ undefined,
          /** modifiers */ undefined,
          /** ... */ undefined,
          'anchor',
          /** question token */ undefined,
          ts.createLiteralTypeNode(ts.createLiteral('Element')),
          /** initializer */ undefined
        )
      ],
      /** type */ undefined,
      ts.createBlock(
        /** statements */
        [
          ts.createStatement(
            ts.createAssignment(
              ts.createPropertyAccess(
                ts.createThis(),
                this.elementAnchorPropName
              ),
              ts.createIdentifier('anchor')
            )
          ),
          ts.createStatement(
            ts.createAssignment(
              ts.createPropertyAccess(
                ts.createThis(),
                this.elementViewPropName
              ),
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createIdentifier(viewClassName),
                    this.templatePropName
                  ),
                  'create'
                ),
                /*typeArguments*/ undefined,
                /*arguments*/ undefined
              )
            )
          ),
          ts.createVariableStatement(
            /*modifiers*/ undefined,
            [
              ts.createVariableDeclaration(
                AbstractBinding.targetsAccessor,
                /*type*/ undefined,
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementViewPropName
                  ),
                  AbstractBinding.targetsAccessor
                )
              ),
            ]
          ),
          ts.createStatement(
            ts.createAssignment(
              ts.createPropertyAccess(
                ts.createThis(),
                this.bindingPropName
              ),
              ts.createArrayLiteral(
                this.templateFactory.bindings.map(b => {
                  return b.behavior ? this.createBehaviorBinding(b) : b.code;
                }),
                /*multiline*/ true
              )
            ),
          ),
          ts.createReturn(ts.createThis())
        ],
        /** multiline */ true
      )
    );
  }

  private createLifecycleMethods() {
    return [
      ts.createMethod(
        /* decorators */ undefined,
        /* modifiers */ undefined,
        /* asterisk token */ undefined,
        Transformer.lifecycleMethods.bind,
        /* question token */ undefined,
        /* type params */ undefined,
        /* params */ undefined,
        /** type */ undefined,
        /** body */
        ts.createBlock(
          /** statements */
          [
            ts.createVariableStatement(
              /*modifiers*/ undefined,
              [
                ts.createVariableDeclaration(
                  this.elementScopePropName,
                  /*type*/ undefined,
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementScopePropName
                  )
                )
              ]
            ),
            ts.createStatement(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.bindingPropName
                  ),
                  'forEach'
                ),
                /*typeArguments*/undefined,
                [
                  ts.createArrowFunction(
                    /*modifiers*/ undefined,
                    /*typeArguments*/ undefined,
                    [
                      ts.createParameter(
                        /*decorators*/ undefined,
                        /*modifiers*/ undefined,
                        /*dotdotdot*/ undefined,
                        'b',
                        /*question*/undefined,
                        /*type*/undefined,
                        /*initializer*/undefined
                      )
                    ],
                    /*type*/ undefined,
                    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                    ts.createBlock(
                      [
                        ts.createStatement(
                          ts.createCall(
                            ts.createPropertyAccess(
                              ts.createIdentifier('b'),
                              Transformer.lifecycleMethods.bind
                            ),
                            /*typeArguments*/ undefined,
                            /*arguments*/
                            [
                              ts.createIdentifier(this.elementScopePropName)
                            ]
                          )
                        )
                      ],
                      /*multiline*/ true
                    )
                  )
                ]
              )
            )
          ],
          /** multiline */ true
        )
      ),
      ts.createMethod(
        /* decorators */ undefined,
        /* modifiers */ undefined,
        /* asterisk token */ undefined,
        Transformer.lifecycleMethods.attach,
        /* question token */ undefined,
        /* type params */ undefined,
        /* params */ undefined,
        /** type */ undefined,
        /** body */
        ts.createBlock(
          /** statements */
          [
            ts.createStatement(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementViewPropName
                  ),
                  'appendTo'
                ),
                /*typeArguments*/undefined,
                [
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementAnchorPropName
                  )
                ]
              )
            )
          ],
          /** multiline */ true
        )
      ),
      ts.createMethod(
        /* decorators */ undefined,
        /* modifiers */ undefined,
        /* asterisk token */ undefined,
        Transformer.lifecycleMethods.detach,
        /* question token */ undefined,
        /* type params */ undefined,
        /* params */ undefined,
        /** type */ undefined,
        /** body */
        ts.createBlock(
          /** statements */
          [
            ts.createStatement(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementViewPropName
                  ),
                  'remove'
                ),
                /*typeArguments*/undefined,
                /*arugments*/undefined
              )
            )
          ],
          /** multiline */ true
        )
      ),
      ts.createMethod(
        /* decorators */ undefined,
        /* modifiers */ undefined,
        /* asterisk token */ undefined,
        Transformer.lifecycleMethods.unbind,
        /* question token */ undefined,
        /* type params */ undefined,
        /* params */ undefined,
        /** type */ undefined,
        /** body */
        ts.createBlock(
          /** statements */
          [
            ts.createVariableStatement(
              /*modifiers*/ undefined,
              [
                ts.createVariableDeclaration(
                  this.elementScopePropName,
                  /*type*/ undefined,
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.elementScopePropName
                  )
                )
              ]
            ),
            ts.createStatement(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createPropertyAccess(
                    ts.createThis(),
                    this.bindingPropName
                  ),
                  'forEach'
                ),
                /*typeArguments*/undefined,
                [
                  ts.createArrowFunction(
                    /*modifiers*/ undefined,
                    /*typeArguments*/ undefined,
                    [
                      ts.createParameter(
                        /*decorators*/ undefined,
                        /*modifiers*/ undefined,
                        /*dotdotdot*/ undefined,
                        'b',
                        /*question*/undefined,
                        /*type*/undefined,
                        /*initializer*/undefined
                      )
                    ],
                    /*type*/ undefined,
                    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                    ts.createBlock(
                      [
                        ts.createStatement(
                          ts.createCall(
                            ts.createPropertyAccess(
                              ts.createIdentifier('b'),
                              Transformer.lifecycleMethods.unbind
                            ),
                            /*typeArguments*/ undefined,
                            /*arguments*/
                            [
                              ts.createIdentifier(this.elementScopePropName)
                            ]
                          )
                        )
                      ],
                      /*multiline*/ true
                    )
                  )
                ]
              )
            )
          ],
          /** multiline */ true
        )
      ),
    ];
  }

  private createBehaviorBinding(b: AbstractBinding) {
    return ts.createBinary(
      ts.createPropertyAccess(
        ts.createThis(),
        '$b1'
      ),
      ts.SyntaxKind.EqualsToken,
      b.code,
    );
  }

  // private createBindingsProp() {
  //   return ts.createProperty(
  //     /* decorators */ undefined,
  //     [
  //       ts.createToken(ts.SyntaxKind.PublicKeyword),
  //       ts.createToken(ts.SyntaxKind.StaticKeyword)
  //     ],
  //     this.bindingPropName,
  //     /* question token */ undefined,
  //     /* type node */ undefined,
  //     ts.createCall(
  //       ts.createIdentifier('hydrateBindings'),
  //       /* type arguments */ undefined,
  //       /* arguments */
  //       [
  //         ts.createArrayLiteral(
  //           this.templateFactory.bindings.map(binding => {
  //             return binding.code
  //           }),
  //           /* multiline */ true
  //         )
  //       ]
  //     ),
  //   );
  // }

  private createObserverGetter(name: string) {
    return ts.createGetAccessor(
      /* decorators */undefined,
      [
        ts.createToken(ts.SyntaxKind.PublicKeyword)
      ],
      name,
      /* parameters */ undefined,
      /* type */ undefined,
      ts.createBlock([
        ts.createReturn(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createPropertyAccess(
                ts.createPropertyAccess(
                  ts.createThis(),
                  this.observerPropName
                ),
                name
              ),
              'getValue'
            ),
            /* type arguments */ undefined,
            /* arguments */ undefined
          )
        )
      ])
    );
  }

  private createObserverSetter(name: string, paramName = 'v', type?: string) {
    return ts.createSetAccessor(
      undefined,
      [
        ts.createToken(ts.SyntaxKind.PublicKeyword)
      ],
      name,
      [
        ts.createParameter(
          /* decorators */ undefined,
          /* modifiers */ undefined,
          /* dotdotdot token */undefined,
          paramName,
          /* question token */ undefined,
          /* type */ undefined,
          /* initializer */undefined
        )
      ],
      ts.createBlock([
        ts.createStatement(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createPropertyAccess(
                ts.createPropertyAccess(
                  ts.createThis(),
                  this.observerPropName
                ),
                name
              ),
              'setValue'
            ),
            /* type arguments */ undefined,
            /* arguments */
            [
              ts.createIdentifier(paramName)
            ]
          )
        )
      ])
    );
  }

  // =============================
  // VIEW CLASS GENERATION
  // =============================

  private visitClassDeclaration(node: ts.ClassDeclaration) {
    return node;
    // if (!this.isCustomElement(node)) {
    //   return node;
    // }
    // this.exportedElements = this.exportedElements || [];
    // let exportedElement = this.exportedElements.find(e => e.name === node.name.escapedText.toString());
    // if (!exportedElement) {
    //   exportedElement = { name: node.name.escapedText.toString() };
    //   this.exportedElements.push(exportedElement);
    // }
    // return this.updateCustomElementClass(node);
  }

  private updateCustomElementClass(node: ts.ClassDeclaration) {
    const viewClassName = getElementViewName(node.name);
    const classMembers = [...node.members];
    let bindMethod = classMembers.find(member => member.kind === ts.SyntaxKind.MethodDeclaration
      && member.name.toString() === 'bind'
    ) as ts.MethodDeclaration;
    let bindMethodBody: ts.Block;
    let bindMethodIndex: number = -1;
    if (bindMethod) {
      bindMethodIndex = classMembers.indexOf(bindMethod);
      classMembers.splice(bindMethodIndex, 1);
      bindMethodBody = (bindMethod as ts.MethodDeclaration).body;
    } else {
      bindMethod = {} as any;
      bindMethodBody = ts.createBlock([]);
    }
    bindMethod = ts.createMethod(
      bindMethod.decorators,
      bindMethod.modifiers,
      bindMethod.asteriskToken,
      'bind',
      bindMethod.questionToken,
      bindMethod.typeParameters,
      bindMethod.parameters,
      bindMethod.type,
      ts.createBlock(
        [
          ts.createStatement(
            ts.createCall(
              ts.createPropertyAccess(
                ts.createSuper(),
                ts.createIdentifier('bind')
              ),
              undefined,
              undefined
            ),
          ),
          ...bindMethodBody.statements
        ],
        /** multiline */ true
      )
    );
    classMembers.splice(bindMethodIndex === -1 ? 0 : bindMethodIndex, 0, bindMethod);
    return ts.updateClassDeclaration(
      node,
      Array.isArray(node.decorators) ? node.decorators : undefined,
      [...node.modifiers],
      node.name,
      [...(node.typeParameters || [])],
      [
        ts.createHeritageClause(
          ts.SyntaxKind.ExtendsKeyword,
          [
            ts.createExpressionWithTypeArguments(
              undefined,
              ts.createIdentifier(viewClassName)
            )
          ]
        ),
      ],
      classMembers
    );
  }
}