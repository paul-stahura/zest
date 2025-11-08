for file in *.csv; do
  # Create a temporary file
  temp_file=$(mktemp)
  
  # Extract the filename without extension
  filename=$(basename "$file" .csv)
  
  # Get the first line (old header)
  header=$(head -n 1 "$file")
  
  # Split the header into parts
  IFS=',' read -r name color skipCriticalLine samplingInterval <<< "$header"
  
  # Write the new format to temp file
  echo "# Point Set File Format:" > "$temp_file"
  echo "# Settings are specified with #@ prefix followed by name: value" >> "$temp_file"
  echo "#@name: $name" >> "$temp_file"
  echo "#@color: $color" >> "$temp_file"
  echo "#@skipCriticalLine: ${skipCriticalLine:-false}" >> "$temp_file"
  echo "#@samplingInterval: ${samplingInterval:-1}" >> "$temp_file"
  echo "# Data format: real,imaginary" >> "$temp_file"
  echo "" >> "$temp_file"
  
  # Append the data (skipping the header)
  tail -n +2 "$file" >> "$temp_file"
  
  # Move temp file to original
  mv "$temp_file" "$file"
done
