from PIL import Image
import sys

img_path = sys.argv[1]
try:
    img = Image.open(img_path)
    pixels = img.load()
    width, height = img.size
    print(f"Image width: {width}")
    
    # Simple logic to find the dark grey bar and light grey bar
    # We look for a line that has a long continuous sequence of dark grey pixels
    # Dark grey is expected around #4b5563 (r=75,g=85,b=99) or #3b4254 (r=59,g=66,b=84)
    # Let's search row by row
    bar_y = -1
    for y in range(height):
        dark_count = 0
        for x in range(width):
            r, g, b = pixels[x, y][:3]
            if 40 <= r <= 100 and 45 <= g <= 105 and 50 <= b <= 110:
                dark_count += 1
            else:
                dark_count = 0
            if dark_count > 100:  # Found a long dark sequence
                bar_y = y
                break
        if bar_y != -1:
            break

    if bar_y != -1:
        print(f"Found bar around Y = {bar_y}")
        row = [pixels[x, bar_y][:3] for x in range(width)]
        
        start_dark, end_dark = -1, -1
        for x in range(width):
            r, g, b = row[x]
            if 40 <= r <= 100 and 45 <= g <= 105 and 50 <= b <= 110:
                if start_dark == -1: start_dark = x
                end_dark = x
                
        start_light, end_light = -1, -1
        # Start looking from end_dark
        for x in range(end_dark + 1, width):
            r, g, b = row[x]
            # Light grey #e5e7eb (r=229, g=231, b=235)
            if 200 <= r <= 245 and 200 <= g <= 245 and 200 <= b <= 245:
                if start_light == -1: start_light = x
                end_light = x
                
        print(f"Dark bar: X={start_dark} to {end_dark} (width: {end_dark - start_dark + 1} px)")
        if start_light != -1:
            print(f"Light bar: X={start_light} to {end_light} (width: {end_light - start_light + 1} px)")
            print(f"Gap: {start_light - end_dark - 1} px")
            ratio = (end_dark - start_dark + 1) / (end_light - start_light + 1)
            print(f"Ratio Dark/Light: {ratio:.2f}")
        else:
            print("Light bar not found on this row.")
except Exception as e:
    print(e)

