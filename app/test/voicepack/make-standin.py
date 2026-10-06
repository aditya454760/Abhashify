"""Writes a tiny stand-in for a Piper voice: standin.onnx (outputs each phoneme id / 1000 as the 'audio') and standin.onnx.json.
It lets the tests check the whole offline chain (text -> phonemes -> ids -> model -> WAV) without a real voice. Needs: pip install onnx"""
import sys, json, onnx
from onnx import helper, TensorProto as T
out = sys.argv[1]
inp = helper.make_tensor_value_info('input', T.INT64, [1, 'n']); il = helper.make_tensor_value_info('input_lengths', T.INT64, [1]); sc = helper.make_tensor_value_info('scales', T.FLOAT, [3])
o = helper.make_tensor_value_info('output', T.FLOAT, [1, 1, 1, 'n'])
nodes = [helper.make_node('Reshape', ['input', 'shp'], ['r']), helper.make_node('Cast', ['r'], ['f'], to=T.FLOAT), helper.make_node('Mul', ['f', 'k'], ['output'])]
g = helper.make_graph(nodes, 'standin', [inp, il, sc], [o], [helper.make_tensor('shp', T.INT64, [4], [1, 1, 1, -1]), helper.make_tensor('k', T.FLOAT, [], [0.001])])
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 13)]); m.ir_version = 8; onnx.checker.check_model(m); onnx.save(m, out + '/standin.onnx')
idmap = {'_': [0], '^': [1], '$': [2], ' ': [3], '.': [4], ',': [5], '?': [6], '!': [7], ':': [8], ';': [9]}
nxt = 10
for lo, hi in [(0x61, 0x7b), (0xC0, 0x250), (0x250, 0x370), (0x370, 0x380), (0x2B0, 0x300)]:
    for cp in range(lo, hi):
        ch = chr(cp)
        if ch not in idmap: idmap[ch] = [nxt]; nxt += 1
for voice in ('en-us', 'hi'):
    json.dump({'audio': {'sample_rate': 16000}, 'espeak': {'voice': voice}, 'phoneme_type': 'espeak', 'num_speakers': 1, 'inference': {'noise_scale': .667, 'length_scale': 1, 'noise_w': .8}, 'phoneme_id_map': idmap}, open(out + '/standin-' + voice + '.onnx.json', 'w'), ensure_ascii=False)
print('ok', nxt)
