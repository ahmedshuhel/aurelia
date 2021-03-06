import { expect } from 'chai';
import { tearDown, setupAndStart, cleanup, defineCustomElement } from './prepare';
import { baseSuite } from './template-compiler.base';
import { IContainer, Constructable } from '@aurelia/kernel';
import { Aurelia, IChangeSet, ICustomElementType } from '@aurelia/runtime';

const spec = 'template-compiler.if-else';

// TemplateCompiler - if/else integration
describe(spec, () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  //if - shows and hides
  it('01.', () => {
    const { au, host, cs, component } = setupAndStart(`<template><div if.bind="foo">bar</div></template>`, null);
    component.foo = true;
    cs.flushChanges();
    expect(host.textContent).to.equal('bar');
    component.foo = false;
    cs.flushChanges();
    expect(host.textContent).to.equal('');
    tearDown(au, cs, host);
  });

  //if - shows and hides - toggles else
  it('02.', () => {
    const { au, host, cs, component } = setupAndStart(`<template><div if.bind="foo">bar</div><div else>baz</div></template>`, null);
    component.foo = true;
    cs.flushChanges();
    expect(host.innerText).to.equal('bar');
    component.foo = false;
    cs.flushChanges();
    expect(host.innerText).to.equal('baz');
    component.foo = true;
    cs.flushChanges();
    expect(host.innerText).to.equal('bar');
    tearDown(au, cs, host);
  });

});

type TApp = Constructable<{ ifText: string; elseText: string; show: boolean; }> & ICustomElementType;
const suite = baseSuite.clone<IContainer, Aurelia, IChangeSet, HTMLElement, TApp, InstanceType<TApp>>(spec);

suite.addDataSlot('e').addData('app').setFactory(ctx => {
  const { a: container } = ctx;
  const template = document.createElement('template');

  const ifTemplate = document.createElement('template');
  const elseTemplate = document.createElement('template');
  template.content.appendChild(ifTemplate);
  template.content.appendChild(elseTemplate);
  const ifText = document.createTextNode('${ifText}');
  const elseText = document.createTextNode('${elseText}');
  ifTemplate.content.appendChild(ifText);
  elseTemplate.content.appendChild(elseText);
  ifTemplate.setAttribute('if.bind', 'show');
  elseTemplate.setAttribute('else', '');

  const $App = defineCustomElement('app', template, class App {
    public ifText: string;
    public elseText: string;
    public show: boolean;
  });
  container.register($App);
  return $App;
});

suite.addActionSlot('setup').addAction(null, ctx => {
  const { a: container, b: au, c: cs, d: host, e: app } = ctx;

  const component = ctx.f = new app();
  component.ifText = '1';
  component.elseText = '2';
  component.show = true;

  au.app({ component, host }).start();
});

suite.addActionSlot('act')
.addAction('1', ctx => {
  const { c: cs, d: host, f: component } = ctx;

  expect(host.textContent).to.equal('1');

  component.show = false;

  expect(host.textContent).to.equal('1');

  cs.flushChanges();

  expect(host.textContent).to.equal('2');
});

suite.load();
suite.run();
