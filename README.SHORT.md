# Zest — A Computational Microscope for the Riemann Zeta Function

*Seeing what Riemann could only imagine*

## What This Is

The Riemann Hypothesis has been unsolved for 165 years. It's worth a million dollars. Thousands of mathematicians have attacked it with every theoretical tool available.

But here's a different question: **What if you could just... look at it?**

**That's what Zest is.** A computational microscope for the Riemann Zeta function. You point it at different parts of the complex plane, zoom in, watch patterns emerge, and see things that no amount of equation-staring would reveal.

This tool was created by an engineer, not a mathematician—someone curious enough to ask, "What if I could visualize this function interactively, in real-time?" Someone patient enough to build it and bold enough to share what he found.

## The Discovery

Zest visualizes the partial sum spirals of ζ(s) = Σ(1/n^s) as they wind through the complex plane. The Riemann Hypothesis says all non-trivial zeros have real part σ = 1/2. We've checked ten trillion zeros—every one is on that line. But we don't know *why*.

**Here's what you can see:** When σ = 0.5, spirals can wind all the way around and return to the origin. Move σ away from 0.5—to 0.49, to 0.51—and the spirals *don't make it back.*

**Here's the geometry:** Draw a line from origin to zeta, bisect it. That bisector passes through one spiral point. Now draw two "legs"—origin to bisector point, bisector point to zeta. At σ = 0.5, these legs are *exactly the same length*. When they align (angle = 0), you have a zero—both legs same length, meeting at the origin.

Move σ away from 0.5? The leg lengths diverge. If they're different lengths, they can't both arrive at the same point. Zeros become impossible.

This isn't proof. But it's something you can **see**. Play with it for five minutes, and you'll feel it: there's something special about σ = 0.5.

## What You Can Explore

**The Spirals:** Watch them build term by term. At σ = 2, smooth and well-behaved. At σ = 0.5, rich structure. Near a zero, winds *tightly* around the origin—hundreds of terms conspiring to produce exactly zero.

**The Critical Strip:** A 2D map of the complex plane. Load 100,000 known zeros—all aligned on σ = 0.5. Click anywhere and the spiral view instantly recalculates. Zoom in to see fine structure. Toggle between index space and imaginary space.

**Multiple Formulas:** Six ways to calculate zeta—Riemann-Siegel, Euler-Maclaurin, Eta, and three others. Turn on two at once and watch them trace different spirals but converge to the same value. At σ = 0.5, Riemann-Siegel is *perfect*. Move away? It drifts. The formula knows 0.5 is special.

**Symmetries and Structure:** Turn on the ZPS Bisector to see the two legs. At σ = 0.5, they stay equal as you vary t. Move off 0.5? They diverge immediately. Enable teardrops, remainder functions, inverse spirals—layer visualizations and build intuition through seeing.

## Who Made This

Paul Stahura is an engineer who got curious about the Riemann Hypothesis and thought, "What if I could just *look* at the function?" So he built Zest, implemented six calculation methods, created interactive visualizations, and spent over eight years exploring. He saw things no one had seen before—because no one had built this particular microscope before.

**This is what computational tools are for.** Not replacing thought, but extending perception. Galileo's telescope revealed Jupiter's moons. Zest reveals the geometry of the zeta function.

## How to Start

**Don't overthink it.** Just open Zest and start moving sliders. Five minutes of exploration will teach you more than five paragraphs of explanation.

Suggested path:
1. **Start at s = 2 + 0i**: Euler's sum (π²/6). Watch the spiral wind gently toward 1.645.
2. **Move to s = 0.5 + 10i**: More twists, more personality. Where things get fun.
3. **Jump to a zero**: Load zeta zeros, click the first point (t ≈ 14.13). Watch it wind tight around zero.
4. **Try off the line**: Move σ to 0.49 or 0.51. Watch it fail to reach zero. Something about 0.5 is special.
5. **Play**: Turn on teardrops, compare formulas, follow your curiosity.

## The Joy of Just Looking

You're not trying to solve anything. You're not writing a proof. You're just... looking. Exploring. Noticing patterns.

It's the joy of peering through a telescope at Saturn's rings, examining pond water under a microscope, exploring a new city with no map.

The Riemann Zeta function has been studied since 1859. Modern computers have found ten trillion zeros. But until tools like Zest, almost nobody could actually *see* what the function looks like as a living, breathing geometric object.

**Now you can.**

---

## Getting Started

Download for your platform (Windows or MacOS), or build from source using Unity Editor version **2021.3.45f2**.

**Welcome to the microscope. The spirals are waiting.**
