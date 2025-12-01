# Zest — A Computational Microscope for the Riemann Zeta Function

*Seeing what Riemann could only imagine*

## What This Is

The Riemann Hypothesis is one of the most important unsolved problems in mathematics. It's been open for 165 years. It's worth a million dollars. Thousands of mathematicians have attacked it with every theoretical tool available.

But here's a different question: **What if you could just... look at it?**

Not prove it. Not derive it. Just **see it.** Watch it. Explore it. Like pointing a microscope at a drop of pond water and discovering an entire universe you didn't know existed.

**That's what Zest is.** A computational microscope (or telescope!) for the Riemann Zeta function. You point it at different parts of the complex plane, you zoom in, you watch patterns emerge, take measurements, watch it in motion, and you see things that no amount of equation-staring would reveal.

This tool was created by an engineer, not a mathematician. Someone who asked, "What if I could visualize this function the way we visualize anything else... interactively, in real-time, with modern computing power?" Someone curious enough to look, patient enough to build, and bold enough to share what he found.

What he found is remarkable. And now you can see it too.

## The View

Zest visualizes the partial sum spirals of ζ(s) = Σ(1/n^s) as they wind through the complex plane. Each term is a vector added tip-to-tail, tracing a path toward the final sum. The Riemann Hypothesis says all non-trivial zeros have real part σ = 1/2. They've checked ten trillion zeros—every one is on that line. But we don't know *why*.

**Here's what you can see:** When the real part equals 0.5, spirals can wind all the way around and return to the origin. The thousands of terms add up, rotating and shrinking, and manage to produce exactly zero. It's like watching a lock tumbler click into place where everything aligns, and the spiral closes on itself at (0, 0).

But move the real part away from 0.5—to 0.49, to 0.51, to anywhere else—and the spirals *don't make it back.* They wind around, approach the origin, but miss. They can't quite close the loop.

**Here's the geometry that makes this visible:** Draw a line from the origin to the zeta value. Bisect it. That bisector line passes through one specific point in the spiral. Now draw two "legs"—one from origin to the bisector point, one from the bisector point to zeta. At σ = 0.5, these legs are *exactly the same length*. The spiral is perfectly balanced. When the angle between the legs reaches zero (they align perfectly), you have a zero—both legs aligned, one leg out and the other leg back, same length, meeting at the origin.

Move σ away from 0.5? The leg lengths diverge. But not always! One longer, one shorter. And if they're different lengths, they can't both arrive at the same point. The symmetry breaks. Zeros become impossible.

This isn't a proof. But it's something you can **see**. Play with it for five minutes, and you'll feel it in your bones: there's something special about σ = 0.5. 

Maybe seeing it this way, not just looking at symbols, will spark an idea. Or maybe it'll just give you a visceral understanding of what the Riemann Hypothesis *means* geometrically. Zest at least makes beautiful pictures!

## What You Can Explore

### The Spirals Themselves

Watch them build, term by term. See how they wind inward. Notice how the shape changes as you vary parameters.

- **At σ = 1**: Smooth, well-behaved, converges quickly
- **At σ = 0.5**: Rich structure, interesting twists, where all the action is
- **Near a zero**: Winds *tightly* around the origin, hundreds of terms conspiring to produce exactly zero

Move the index slider slowly and watch the spiral breathe. Jump to specific values and see how they differ.

### The Critical Strip: A Map of All Possible Spirals

The Critical Strip viewing area shows a 2D map of the complex plane. Horizontal axis is σ (real part), vertical is t (imaginary part).
The horizontal axis could be other units too, for example, an angle between -pi and pi.

Load the **10,000 or 100,000 known zeros**. They appear as points—every single one perfectly aligned on σ = 0.5. It's staggering. Ten trillion zeros have been checked, and they're *all* on that line.

Click on any point in the critical strip, and the spiral view instantly recalculates for that point. You're teleporting through mathematical space.

**Zoom in.** See the fine structure—how zeros cluster, where gaps appear, subtle patterns in their spacing. Zoom in more! More!

**Toggle coordinate modes.** Switch between "index" (a new unit) and "imaginary" (the classic units).

### Multiple Formulas: Different Paths to the Same Truth

There are six built-in ways to calculate the zeta function:
- **Riemann-Siegel**: Optimized for σ = 0.5, blazingly fast there
- **Euler-Maclaurin**: General purpose, works anywhere
- **Alexey Kuznetsov**: Simple and accurate 
- Three others, each with their own character, pluses and minuses
- Also the Eta function is available

Turn on two sums at once. Watch them trace different spirals with different intermediate points, but converge to the same final value. It's like watching two hikers take different trails up the same mountain—they meet at the summit.

Zip to Gram points using the slider. What do you notice about them?

### Symmetries and Hidden Structure

Turn on the **ZPS Bisector** visualization—it draws the two "legs" from origin → bisector point → zeta. At σ = 0.5, watch them stay equal length as you vary t. Move σ off 0.5? They immediately diverge. This is an interesting fact: equal legs = possible zeros. Unequal legs = no zeros possible.

Enable "yin-yang" teardrops—shapes by a link's ends traced in the local frame of reference.

Turn on remainder functions (Rps, Rak). They are different ways of expressing Siegel's remainder function.

Turn on various paths to trace what happens when the imaginary part is changed, or when the real part is changed.

## Who Made This and Why

Paul Stahura is an engineer. Not a number theorist. Not a complex analysis expert. An engineer who got curious about the Riemann Hypothesis and thought, "What if I could just *look* at the function?"

So he asked some folks to build Zest. Make interactive visualizations. Build controls for exploring tons of parameters.

And then he looked. Really looked. He spent over eight years exploring, zooming, comparing, noticing patterns. He saw things about the critical strip and the zeros that no one had seen before—because no one had built this particular microscope before.  Note this elaborate, at least. 

Where is the exact, symbolic point along the spiral where the symmetry occurs?  The point that is simultaneously continuous in 2-d (the complex plane) and in 1-d (the spiral). He figured it out.

**This is what computational tools are for.** Not replacing mathematical symbols, but extending perception. Galileo's telescope didn't replace astronomy; it revealed moons around Jupiter. And after some observational measurements, do those moons' orbits make ellipses? A mathematical formula?  Zest is the same idea: use visualization to generate conjectures. Prove conjectures using symbols.

## What You Might Discover

Nobody knows what you'll notice. That's the point. Choose a random point high up. You are the 1st person to ever see that object.

Maybe you'll see a pattern in how zeros cluster. Maybe you'll notice something about remainder behavior. Maybe you'll observe correlations that suggest new questions.

Or maybe you'll just build intuition. Maybe after exploring, you'll *understand* the Riemann Hypothesis in a way that reading papers never achieved. You'll feel it geometrically. Viscerally. 
Zeta equals zero only when σ = 0.5  ...Or maybe not, lol. 
Yes, Riemann knew the sum does not converge, but did he also know the sum produces complex beautiful spirals with a weird symmetry?

**Visual intuition is real intuition.** Some of history's greatest mathematicians—Euler, Gauss, Ramanujan—had extraordinary geometric intuition. They could "see" mathematical structure in ways that formal training doesn't capture. Us non-geniuses need a computer to see it.

Zest gives you access to that mode of understanding. Not through genius, but through computational power.

## How to Start

**Don't overthink it.** Just open Zest and start moving sliders. Five minutes of exploration will teach you more than five paragraphs of explanation.

Suggested path:

1. Download for your platform (Windows or MacOS), or build from source using Unity Editor version **2021.3.45f2**.
2. **Start at s = 2 + 0i**: Euler's famous sum equal to π²/6. Watch the spiral wind gently toward 1.645.
3. **Move to the critical line**: s = 0.5 + 10i. More twists. More personality. Where things get fun.
4. **Jump to a zero**: Load zeta zeros, click the first point (t ≈ 14.13). Watch the spiral wind *tight* around the origin.
5. **Try off the critical line**: Move σ to 0.49 or 0.51. Watch what happens. The spiral doesn't make it back to zero. Something about σ = 0.5 is special.
6. **Play**: Turn on teardrops. Load different datasets. Compare formulas. Follow your curiosity.

Try the pre-sets!

There's no wrong way to explore. This is your computational microscope. Point it wherever you want.

## The Joy of Just Looking

You're not trying to solve anything. You're not writing a proof. You're not grinding through calculations. You're just... looking. Exploring. Noticing patterns. Following hunches.

It's the same joy as peering through a telescope at Saturn's rings, examining pond water under a microscope, watching time-lapse video of plants growing.

There's wonder in observation. There's pleasure in seeing something beautiful. There's satisfaction in understanding through perception rather than derivation.

The Riemann Zeta function has been studied since 1859. Riemann himself calculated the first few zeros by hand. Modern computers have found ten trillion more. But until tools like Zest, almost nobody could actually *see* what the function looks like as a living, breathing geometric object.

If you really want to dig into the details, the terminology and the equations behind it, read this paper: [link]

**Welcome to the microscope. The spirals are waiting.**


---
