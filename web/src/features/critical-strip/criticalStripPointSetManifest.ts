export type ManifestEntry = {
  id: string;
  filename: string;
  label: string;
};

/**
 * Arias de Reyna's positive-t zeros of Siegel's f(s) (25-digit list, 162k zeros).
 * Kept OUT of the normal multiselect manifest: it is shown via a dedicated
 * "solo" overlay toggle that, when on, displays ONLY this set and hides every
 * other selected background overlay. Source archived at
 * papers/f-negative-t/arias_positive_zeros_of_f_25digits.txt; the CSV stores
 * the index T = indexToImag^{-1}(t).
 */
export const ARIAS_POS_T_SET: ManifestEntry = {
  id: "95-arias-pos-t",
  filename: "95 Arias Positive-t f-Zeros.csv",
  label: "Arias f-Zeros (t>0)",
};

export const CRITICAL_STRIP_MANIFEST: ManifestEntry[] = [
  { id: "00-zeta-zeros",         filename: "00 Zeta Zeros.csv",                              label: "Zeta Zeros" },
  { id: "01-gram-points",        filename: "01 Gram Points.csv",                             label: "Gram Points" },
  { id: "01a-champions",         filename: "champions_149_with_precise_T.csv",               label: "Zeta Champions" },
  { id: "01b-gram-champions",    filename: "01b Gram Champions.csv",                         label: "Gram Champions" },
  { id: "01b-diophantine-grid",  filename: "02 Diophantine Grid.csv",                        label: "Diophantine Grid p=2" },
  { id: "01c-diophantine-2-3",   filename: "02b Diophantine Grid p2-3.csv",                  label: "Diophantine Grid p=2,3" },
  { id: "01d-diophantine-2-3-5", filename: "02c Diophantine Grid p2-3-5.csv",                label: "Diophantine Grid p=2,3,5" },
  { id: "01e-diophantine-2-3-5-7-11", filename: "02d Diophantine Grid p2-3-5-7-11.csv",      label: "Diophantine Grid p=2,3,5,7,11" },
  { id: "02-rps1-zeros-full",    filename: "02 Rps1 Zeros [T0-40 σ-9to10].csv",             label: "Rps1 Zeros [T0-40]" },
  { id: "02-rps1-zetas-full",    filename: "02 Rps1 Zetas [T0-40 σ-9to10].csv",             label: "Rps1 Zetas [T0-40]" },
  { id: "02-rak1-zeros-full",    filename: "02 Rak1 Zeros [T0-40 σ-9to10].csv",             label: "Rak1 Zeros [T0-40]" },
  { id: "02-rak1-zetas-full",    filename: "02 Rak1 Zetas [T0-40 σ-9to10].csv",             label: "Rak1 Zetas [T0-40]" },
  { id: "04-zak-leg-angle-pi",   filename: "04 Zak Leg Angle = PI [σ5].csv",                label: "Zak Leg Angle = PI [σ5]" },
  { id: "05-zak-leg-angle-zero", filename: "05 Zak Leg Angle = Zero [σ5].csv",              label: "Zak Leg Angle = Zero [σ5]" },
  { id: "10-zps-equal-legs",     filename: "10 Zps Equal Leg Lengths [1-20].csv",           label: "Zps Equal Leg Lengths [1-20]" },
  { id: "11-zps-equal-025-075",  filename: "11 Zps Equal Leg Length at 0.25 0.75 [1-20].csv", label: "Zps Equal Leg Length 0.25/0.75 [1-20]" },
  { id: "12-zps-leg-angle-pi",   filename: "12 Zps Leg Angle = PI [1-20].csv",              label: "Zps Leg Angle = PI [1-20]" },
  { id: "13-zps-leg-angle-zero", filename: "13 Zps Leg Angle = Zero [1-11].csv",            label: "Zps Leg Angle = Zero [1-11]" },
  { id: "50-theta2-05",          filename: "50 Theta2 σ = 0.5.csv",                         label: "Theta2 σ = 0.5" },
  { id: "51-theta2-05-minmax",   filename: "51 Theta2 σ = 0.5, Local Min and Max.csv",      label: "Theta2 σ = 0.5 Local Min/Max" },
  { id: "52-theta2-025",         filename: "52 Theta2 σ = 0.25.csv",                        label: "Theta2 σ = 0.25" },
  { id: "53-theta2-0125",        filename: "53 Theta2 σ = 0.125.csv",                       label: "Theta2 σ = 0.125" },
  { id: "54-theta2-0375",        filename: "54 Theta2 σ = 0.375.csv",                       label: "Theta2 σ = 0.375" },
  { id: "56-theta2-0-or-1",      filename: "56 Theta2 σ = 0 or 1.csv",                     label: "Theta2 σ = 0 or 1" },
  { id: "57-theta1-05",          filename: "57 Theta1 σ = 0.5.csv",                         label: "Theta1 σ = 0.5" },
  { id: "90-r-equal-legs",       filename: "90 R Equal Legs.csv",                           label: "R Equal Legs" },
  { id: "91-rak-equal-legs",     filename: "91 Rak Equal Legs.csv",                         label: "Rak Equal Legs" },
  { id: "92-sums-equal-legs",    filename: "92 Sums Equal Legs.csv",                        label: "Sums Equal Legs" },
  { id: "93-rps-to-rak",         filename: "93 RpsToRak Equal Legs.csv",                    label: "RpsToRak Equal Legs" },
];
