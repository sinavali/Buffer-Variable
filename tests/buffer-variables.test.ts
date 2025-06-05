import { View, ViewSync } from '../src';

describe('buffer-variables', () => {
  it('encodes and decodes simple object', () => {
    const data = { num: 42, str: 'hello' };
    const view = View.createView(data, { mutable: true });
    const sab = new SharedArrayBuffer(view.byteSize);
    view.encode(data, sab);
    expect(view.decode(sab)).toEqual(data);
  });

  it('syncs bound variable', done => {
    const data = { counter: 0 };
    const view = View.createView(data, { mutable: true });
    const sab = new SharedArrayBuffer(view.byteSize);
    view.encode(data, sab);

    const sync = new ViewSync(view, sab, { pollInterval: 10 });
    const bound = sync.bind(data);
    sync.onUpdateCallback(updated => {
      expect(updated.counter).toBe(1);
      sync.destroy();
      done();
    });

    bound.counter = 1;
    sync.syncToSab();
  });
});