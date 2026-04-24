from PIL import Image
import sys

img_path = sys.argv[1]
try:
    img = Image.open(img_path)
    pixels = img.load()
    width, height = img.size
    print(f"Width {width}, Height {height}")
    
    # scan for anything that looks like a progress bar in the middle column
    mid_x = int(width * 0.4)
    for y in range(height):
        r,g,b = pixels[mid_x, y][:3]
        if r < 100 and g < 100 and b < 100 and abs(r-g)<15 and abs(g-b)<15 and r > 30:
            print(f"Found dark pixel at {mid_x}, {y}: RGB({r},{g},{b})")
            # find start and end of dark bar
            start_x = mid_x
            while start_x > 0:
                pr, pg, pb = pixels[start_x, y][:3]
                if not (pr < 100 and pg < 100 and pb < 100 and pr > 30):
                    break
                start_x -= 1
                
            end_x = mid_x
            while end_x < width - 1:
                pr, pg, pb = pixels[end_x, y][:3]
                if not (pr < 100 and pg < 100 and pb < 100 and pr > 30):
                    break
                end_x += 1
                
            print(f"Dark bar bounds: {start_x} to {end_x}")
            
            # Now find light bar starting near end_x
            start_light = -1
            end_light = -1
            for lx in range(end_x, width):
                pr, pg, pb = pixels[lx, y][:3]
                if 200 <= pr <= 235 and 200 <= pg <= 235 and 200 <= pb <= 235:
                    if start_light == -1: start_light = lx
                    end_light = lx
            print(f"Light bar bounds: {start_light} to {end_light}")
            break
except Exception as e:
    print("Error:", e)
