package jagex2.graphics;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;

public class Pix8 extends Pix2D {

	@ObfuscatedName("WRRBQEHV.J")
	public int owi;

	@ObfuscatedName("WRRBQEHV.K")
	public int ohi;

	@ObfuscatedName("WRRBQEHV.E")
	public int[] bpal;

	@ObfuscatedName("WRRBQEHV.H")
	public int xof;

	@ObfuscatedName("WRRBQEHV.I")
	public int yof;

	@ObfuscatedName("WRRBQEHV.F")
	public int wi;

	@ObfuscatedName("WRRBQEHV.G")
	public int hi;

	@ObfuscatedName("WRRBQEHV.D")
	public byte[] pixels;

	public Pix8(Jagfile jag, String name, int sprite) {
		Packet data = new Packet(jag.read(name + ".dat", null));
		Packet index = new Packet(jag.read("index.dat", null));
		index.pos = data.g2();

		this.owi = index.g2();
		this.ohi = index.g2();

		int palCount = index.g1();
		this.bpal = new int[palCount];
		for (int i = 0; i < palCount - 1; i++) {
			this.bpal[i + 1] = index.g3();
		}

		for (int i = 0; i < sprite; i++) {
			index.pos += 2;
			data.pos += index.g2() * index.g2();
			index.pos++;
		}

		this.xof = index.g1();
		this.yof = index.g1();
		this.wi = index.g2();
		this.hi = index.g2();
		int pixelOrder = index.g1();

		int len = this.hi * this.wi;
		this.pixels = new byte[len];

		if (pixelOrder == 0) {
			for (int i = 0; i < len; i++) {
				this.pixels[i] = data.g1b();
			}
		} else if (pixelOrder == 1) {
			for (int x = 0; x < this.wi; x++) {
				for (int y = 0; y < this.hi; y++) {
					this.pixels[this.wi * y + x] = data.g1b();
				}
			}
		}
	}

	@ObfuscatedName("WRRBQEHV.b(I)V")
	public void halveSize() {
		this.owi /= 2;
		this.ohi /= 2;

		byte[] temp = new byte[this.ohi * this.owi];
		int i = 0;
		for (int y = 0; y < this.hi; y++) {
			for (int x = 0; x < this.wi; x++) {
				temp[(this.xof + x >> 1) + (this.yof + y >> 1) * this.owi] = this.pixels[i++];
			}
		}
		this.pixels = temp;

		this.wi = this.owi;
		this.hi = this.ohi;
		this.xof = 0;
		this.yof = 0;
	}

	@ObfuscatedName("WRRBQEHV.a(Z)V")
	public void trim() {
		if (this.owi == this.wi && this.ohi == this.hi) {
			return;
		}

		byte[] temp = new byte[this.ohi * this.owi];
		int i = 0;
		for (int y = 0; y < this.hi; y++) {
			for (int x = 0; x < this.wi; x++) {
				temp[(this.yof + y) * this.owi + this.xof + x] = this.pixels[i++];
			}
		}
		this.pixels = temp;

		this.wi = this.owi;
		this.hi = this.ohi;
		this.xof = 0;
		this.yof = 0;
	}

	@ObfuscatedName("WRRBQEHV.c(I)V")
	public void hflip() {
		byte[] temp = new byte[this.hi * this.wi];
		int i = 0;
		for (int y = 0; y < this.hi; y++) {
			for (int x = this.wi - 1; x >= 0; x--) {
				temp[i++] = this.pixels[this.wi * y + x];
			}
		}
		this.pixels = temp;

		this.xof = this.owi - this.wi - this.xof;
	}

	@ObfuscatedName("WRRBQEHV.b(B)V")
	public void vflip() {
		byte[] temp = new byte[this.hi * this.wi];
		int i = 0;
		for (int y = this.hi - 1; y >= 0; y--) {
			for (int x = 0; x < this.wi; x++) {
				temp[i++] = this.pixels[this.wi * y + x];
			}
		}
		this.pixels = temp;

		this.yof = this.ohi - this.hi - this.yof;
	}

	@ObfuscatedName("WRRBQEHV.a(IIII)V")
	public void rgbAdjust(int arg0, int arg1, int arg2) {
		for (int var5 = 0; var5 < this.bpal.length; var5++) {
			int var6 = this.bpal[var5] >> 16 & 0xFF;
			int var7 = arg2 + var6;
			if (var7 < 0) {
				var7 = 0;
			} else if (var7 > 255) {
				var7 = 255;
			}

			int var8 = this.bpal[var5] >> 8 & 0xFF;
			int var9 = arg1 + var8;
			if (var9 < 0) {
				var9 = 0;
			} else if (var9 > 255) {
				var9 = 255;
			}

			int var10 = this.bpal[var5] & 0xFF;
			int var11 = arg0 + var10;
			if (var11 < 0) {
				var11 = 0;
			} else if (var11 > 255) {
				var11 = 255;
			}

			this.bpal[var5] = (var7 << 16) + (var9 << 8) + var11;
		}
	}

	@ObfuscatedName("WRRBQEHV.a(III)V")
	public void plotSprite(int arg0, int arg1) {
		int var4 = this.xof + arg1;
		int var5 = this.yof + arg0;
		int var6 = Pix2D.width2d * var5 + var4;
		int var7 = 0;
		int var8 = this.hi;
		int var9 = this.wi;
		int var10 = Pix2D.width2d - var9;
		int var11 = 0;
		if (var5 < Pix2D.top) {
			int var12 = Pix2D.top - var5;
			var8 -= var12;
			var5 = Pix2D.top;
			var7 += var9 * var12;
			var6 += Pix2D.width2d * var12;
		}
		if (var5 + var8 > Pix2D.bottom) {
			var8 -= var5 + var8 - Pix2D.bottom;
		}
		if (var4 < Pix2D.left) {
			int var13 = Pix2D.left - var4;
			var9 -= var13;
			var4 = Pix2D.left;
			var7 += var13;
			var6 += var13;
			var11 += var13;
			var10 += var13;
		}
		if (var4 + var9 > Pix2D.right) {
			int var14 = var4 + var9 - Pix2D.right;
			var9 -= var14;
			var11 += var14;
			var10 += var14;
		}
		if (var9 > 0 && var8 > 0) {
			this.plot(var7, Pix2D.data, this.pixels, var11, this.bpal, var8, var9, var6, var10);
		}
	}

	@ObfuscatedName("WRRBQEHV.a(I[I[BI[IIIIZI)V")
	public void plot(int arg0, int[] arg1, byte[] arg2, int arg3, int[] arg4, int arg5, int arg6, int arg7, int arg9) {
		int var11 = -(arg6 >> 2);
		int var12 = -(arg6 & 0x3);
		for (int var13 = -arg5; var13 < 0; var13++) {
			for (int var14 = var11; var14 < 0; var14++) {
				byte var17 = arg2[arg0++];
				if (var17 == 0) {
					arg7++;
				} else {
					arg1[arg7++] = arg4[var17 & 0xFF];
				}
				byte var18 = arg2[arg0++];
				if (var18 == 0) {
					arg7++;
				} else {
					arg1[arg7++] = arg4[var18 & 0xFF];
				}
				byte var19 = arg2[arg0++];
				if (var19 == 0) {
					arg7++;
				} else {
					arg1[arg7++] = arg4[var19 & 0xFF];
				}
				byte var20 = arg2[arg0++];
				if (var20 == 0) {
					arg7++;
				} else {
					arg1[arg7++] = arg4[var20 & 0xFF];
				}
			}
			for (int var15 = var12; var15 < 0; var15++) {
				byte var16 = arg2[arg0++];
				if (var16 == 0) {
					arg7++;
				} else {
					arg1[arg7++] = arg4[var16 & 0xFF];
				}
			}
			arg7 += arg9;
			arg0 += arg3;
		}
	}
}
