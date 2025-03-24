import math
import csv

def imag_to_index(imag):
    # Constants from the C# code
    gamma = 0.57721566490153286060651209008240243104215933593992
    e = 2.7182818284590452353602874713526624977572
    gamma_to_the_e = math.pow(gamma, e)  # = .2245172519832320
    two_root_3_pi = 2 * math.sqrt(3 * math.pi)
    
    # The formula from the C# code
    return_this = math.sqrt(6 * gamma_to_the_e / imag + 6 * imag + math.pi) / two_root_3_pi - 1.0 / 2.0
    return return_this

def process_file():
    input_file = "Assets/Resources/CriticalStripPoints/zeta-zeros-100k.csv"
    output_file = "Assets/Resources/CriticalStripPoints/zeta-zeros-100k-with-indices.csv"
    
    # Read the input file and process each line
    with open(input_file, 'r') as infile, open(output_file, 'w', newline='') as outfile:
        # Write the header
        outfile.write("Zeta Zeros,#FF00FF\n")
        
        # Skip the header in the input file
        next(infile)
        
        # Process each line
        for line in infile:
            real, imag = map(float, line.strip().split(','))
            index = imag_to_index(imag)
            outfile.write(f"{real},{index}\n")
            
    print(f"Processing complete. Output written to {output_file}")

if __name__ == "__main__":
    process_file() 