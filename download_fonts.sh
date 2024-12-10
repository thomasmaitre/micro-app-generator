#!/bin/bash

# Create fonts directory if it doesn't exist
mkdir -p fonts

# Download TT Commons Book font files
curl -L "https://res.cloudinary.com/vizir2/raw/upload/v1732533463/TTCommons-Book_rrjvbp.woff2" -o "fonts/TTCommons-Book.woff2"
curl -L "https://res.cloudinary.com/vizir2/raw/upload/v1732533463/TTCommons-Book_rrjvbp.woff" -o "fonts/TTCommons-Book.woff"

echo "Font files have been downloaded to the fonts directory."
