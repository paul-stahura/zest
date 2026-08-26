#!/usr/bin/env python3
"""Probe: how close does the follower link come to lying ON the bisector
chord?  (The parallelism is exact; this measures the offset.)"""

import mpmath as mp
import numpy as np

from fig_conveyor_follower import state, reverse_joints, C

for T in [6.0 + k / 20 for k in range(21)]:
    d = state(T)
    n0 = d['m'] * (d['m'] + 2)
    v = reverse_joints(d, n0, n0 + 1)
    f0, f1 = C(v[0]), C(v[1])
    a, b = C(d['yin']), C(d['yang'])
    u = (b - a) / abs(b - a)
    mid = (f0 + f1) / 2
    perp = abs(((mid - a) / u).imag)          # distance to the chord line
    along = ((mid - a) / u).real / abs(b - a)  # fraction along the chord
    print('T=%.2f  perp offset=%.4f  midpoint at fraction %.4f of the chord'
          % (T, perp, along))
