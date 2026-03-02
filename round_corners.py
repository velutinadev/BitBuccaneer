from PIL import Image, ImageDraw
import sys

def round_corners(image_path, output_path, radius):
    img = Image.open(image_path).convert("RGBA")
    
    # Create a mask for rounded corners
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    
    # Apply the mask
    img.putalpha(mask)
    img.save(output_path, 'PNG')

if __name__ == "__main__":
    round_corners('icon.png', 'icon-rounded.png', 180)
    print("Rounded corners applied!")
