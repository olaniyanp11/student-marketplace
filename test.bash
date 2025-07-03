#!/bin/bash

# This script displays the content of all files in the './models' directory.

# Check if the 'models' directory exists
if [ -d "./models" ]; then
    echo "Displaying content of files in ./models:"
    echo "-------------------------------------"

    # Iterate over each file in the './models' directory
    for file in ./models/*; do
        # Check if it's a regular file (not a directory or broken link)
        if [ -f "$file" ]; then
            echo "--- Content of $file ---"
            cat "$file"
            echo
        fi
    done
else
    echo "Error: The './models' directory does not exist."
fi