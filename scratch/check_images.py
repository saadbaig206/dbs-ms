import os

pub_dir = r"C:\Users\amtul\Desktop\DBS-System\public"
for fname in os.listdir(pub_dir):
    fpath = os.path.join(pub_dir, fname)
    if os.path.isfile(fpath):
        with open(fpath, "rb") as f:
            header = f.read(16)
        print(f"{fname}: size={os.path.getsize(fpath)} bytes, header={header}")
