#!/usr/bin/env python3
"""
fig_taijitu_text.py -- renders the three characters "taijitu" (太极图) as a
tiny tightly-cropped graphic, so the text of section 6.4 can show them
inline without adding CJK packages to the minimal BasicTeX preamble.

Outputs figures/taijitu.pdf (and .png fallback).  Run:
python3 fig_taijitu_text.py
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

TEXT = '\u592a\u6781\u56fe'   # taijitu, simplified

# prefer a serif CJK face to sit well next to Computer Modern
CANDIDATES = ['Songti SC', 'STSong', 'PingFang SC', 'Hiragino Sans GB',
              'STHeiti', 'Arial Unicode MS']
available = {f.name for f in font_manager.fontManager.ttflist}
family = next((c for c in CANDIDATES if c in available), None)
if family is None:
    raise SystemExit('no CJK font found among: %s' % CANDIDATES)
print('using font:', family)

fig = plt.figure(figsize=(1.5, 0.5))
fig.patch.set_alpha(0)
fig.text(0.01, 0.02, TEXT, fontname=family, fontsize=22, color='black')
for ext, kw in [('pdf', {}), ('png', {'dpi': 600})]:
    fig.savefig('figures/taijitu.' + ext, bbox_inches='tight',
                pad_inches=0.01, transparent=True, **kw)
    print('wrote figures/taijitu.' + ext)
