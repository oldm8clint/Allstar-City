package jagex2.graphics;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;
import java.awt.Component;
import java.awt.Image;
import java.awt.MediaTracker;
import java.awt.Toolkit;
import java.awt.image.PixelGrabber;

public class Pix32 extends Pix2D {

	@ObfuscatedName("EPQDEJTO.I")
	public int[] pixels;

	@ObfuscatedName("EPQDEJTO.N")
	public int owi;

	@ObfuscatedName("EPQDEJTO.J")
	public int wi;

	@ObfuscatedName("EPQDEJTO.O")
	public int ohi;

	@ObfuscatedName("EPQDEJTO.K")
	public int hi;

	@ObfuscatedName("EPQDEJTO.M")
	public int yof;

	@ObfuscatedName("EPQDEJTO.L")
	public int xof;

	public Pix32(int width, int height) {
		this.pixels = new int[width * height];
		this.wi = this.owi = width;
		this.hi = this.ohi = height;
		this.xof = this.yof = 0;
	}

	public Pix32(byte[] src, Component c) {
		try {
			Image image = Toolkit.getDefaultToolkit().createImage(src);
			MediaTracker tracker = new MediaTracker(c);
			tracker.addImage(image, 0);
			tracker.waitForAll();

			this.wi = image.getWidth(c);
			this.hi = image.getHeight(c);
			this.owi = this.wi;
			this.ohi = this.hi;
			this.xof = 0;
			this.yof = 0;
			this.pixels = new int[this.hi * this.wi];

			PixelGrabber grabber = new PixelGrabber(image, 0, 0, this.wi, this.hi, this.pixels, 0, this.wi);
			grabber.grabPixels();
		} catch (Exception ignore) {
			System.out.println("Error converting jpg");
		}
	}

	public Pix32(Jagfile jag, String name, int sprite) {
		Packet data = new Packet(jag.read(name + ".dat", null));
		Packet index = new Packet(jag.read("index.dat", null));
		index.pos = data.g2();

		this.owi = index.g2();
		this.ohi = index.g2();

		int palCount = index.g1();
		int[] bpal = new int[palCount];
		for (int i = 0; i < palCount - 1; i++) {
			bpal[i + 1] = index.g3();
			if (bpal[i + 1] == 0) {
				bpal[i + 1] = 1;
			}
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
		this.pixels = new int[len];

		if (pixelOrder == 0) {
			for (int i = 0; i < len; i++) {
				this.pixels[i] = bpal[data.g1()];
			}
		} else if (pixelOrder == 1) {
			for (int x = 0; x < this.wi; x++) {
				for (int y = 0; y < this.hi; y++) {
					this.pixels[this.wi * y + x] = bpal[data.g1()];
				}
			}
		}
	}

	@ObfuscatedName("EPQDEJTO.a(Z)V")
	public void bind() {
		Pix2D.bind(this.wi, this.hi, this.pixels);
	}

	@ObfuscatedName("EPQDEJTO.a(IIII)V")
	public void rgbAdjust(int arg0, int arg1, int arg2) {
		for (int var5 = 0; var5 < this.pixels.length; var5++) {
			int var6 = this.pixels[var5];
			if (var6 != 0) {
				int var7 = var6 >> 16 & 0xFF;
				int var8 = arg2 + var7;
				if (var8 < 1) {
					var8 = 1;
				} else if (var8 > 255) {
					var8 = 255;
				}

				int var9 = var6 >> 8 & 0xFF;
				int var10 = arg1 + var9;
				if (var10 < 1) {
					var10 = 1;
				} else if (var10 > 255) {
					var10 = 255;
				}

				int var11 = var6 & 0xFF;
				int var12 = arg0 + var11;
				if (var12 < 1) {
					var12 = 1;
				} else if (var12 > 255) {
					var12 = 255;
				}

				this.pixels[var5] = (var8 << 16) + (var10 << 8) + var12;
			}
		}
	}

	@ObfuscatedName("EPQDEJTO.b(I)V")
	public void trim() {
		int[] temp = new int[this.ohi * this.owi];
		for (int y = 0; y < this.hi; y++) {
			for (int x = 0; x < this.wi; x++) {
				temp[(this.yof + y) * this.owi + this.xof + x] = this.pixels[this.wi * y + x];
			}
		}
		this.pixels = temp;

		this.wi = this.owi;
		this.hi = this.ohi;
		this.xof = 0;
		this.yof = 0;
	}

	@ObfuscatedName("EPQDEJTO.a(III)V")
	public void quickPlotSprite(int arg0, int arg2) {
		int var4 = this.xof + arg2;
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
			this.quickPlot(var9, var10, var8, this.pixels, var7, var11, var6, Pix2D.data);
		}
	}

	@ObfuscatedName("EPQDEJTO.a(III[IIIIB[I)V")
	public void quickPlot(int arg0, int arg1, int arg2, int[] arg3, int arg4, int arg5, int arg6, int[] arg8) {
		int var10 = -(arg0 >> 2);
		int var11 = -(arg0 & 0x3);
		for (int var12 = -arg2; var12 < 0; var12++) {
			for (int var13 = var10; var13 < 0; var13++) {
				arg8[arg6++] = arg3[arg4++];
				arg8[arg6++] = arg3[arg4++];
				arg8[arg6++] = arg3[arg4++];
				arg8[arg6++] = arg3[arg4++];
			}
			for (int var14 = var11; var14 < 0; var14++) {
				arg8[arg6++] = arg3[arg4++];
			}
			arg6 += arg1;
			arg4 += arg5;
		}
	}

	@ObfuscatedName("EPQDEJTO.b(III)V")
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
			this.plot(Pix2D.data, this.pixels, 0, var7, var6, var9, var8, var10, var11);
		}
	}

	@ObfuscatedName("EPQDEJTO.a([I[IIIIIIII)V")
	public void plot(int[] arg0, int[] arg1, int arg2, int arg3, int arg4, int arg5, int arg6, int arg7, int arg8) {
		int var10 = -(arg5 >> 2);
		int var11 = -(arg5 & 0x3);
		for (int var12 = -arg6; var12 < 0; var12++) {
			for (int var13 = var10; var13 < 0; var13++) {
				int var16 = arg1[arg3++];
				if (var16 == 0) {
					arg4++;
				} else {
					arg0[arg4++] = var16;
				}
				int var17 = arg1[arg3++];
				if (var17 == 0) {
					arg4++;
				} else {
					arg0[arg4++] = var17;
				}
				int var18 = arg1[arg3++];
				if (var18 == 0) {
					arg4++;
				} else {
					arg0[arg4++] = var18;
				}
				int var19 = arg1[arg3++];
				if (var19 == 0) {
					arg4++;
				} else {
					arg0[arg4++] = var19;
				}
			}
			for (int var14 = var11; var14 < 0; var14++) {
				int var15 = arg1[arg3++];
				if (var15 == 0) {
					arg4++;
				} else {
					arg0[arg4++] = var15;
				}
			}
			arg4 += arg7;
			arg3 += arg8;
		}
	}

	@ObfuscatedName("EPQDEJTO.b(IIII)V")
	public void transPlotSprite(int arg1, int arg2, int arg3) {
		int var5 = this.xof + arg1;
		int var6 = this.yof + arg2;
		int var7 = Pix2D.width2d * var6 + var5;
		int var8 = 0;
		int var9 = this.hi;
		int var10 = this.wi;
		int var11 = Pix2D.width2d - var10;
		int var12 = 0;
		if (var6 < Pix2D.top) {
			int var13 = Pix2D.top - var6;
			var9 -= var13;
			var6 = Pix2D.top;
			var8 += var10 * var13;
			var7 += Pix2D.width2d * var13;
		}
		if (var6 + var9 > Pix2D.bottom) {
			var9 -= var6 + var9 - Pix2D.bottom;
		}
		if (var5 < Pix2D.left) {
			int var14 = Pix2D.left - var5;
			var10 -= var14;
			var5 = Pix2D.left;
			var8 += var14;
			var7 += var14;
			var12 += var14;
			var11 += var14;
		}
		if (var5 + var10 > Pix2D.right) {
			int var15 = var5 + var10 - Pix2D.right;
			var10 -= var15;
			var12 += var15;
			var11 += var15;
		}
		if (var10 > 0 && var9 > 0) {
			this.transPlot(var10, var12, 0, var11, var8, arg3, var7, var9, Pix2D.data, this.pixels);
		}
	}

	@ObfuscatedName("EPQDEJTO.a(IIIIIIIII[I[I)V")
	public void transPlot(int arg0, int arg1, int arg2, int arg3, int arg4, int arg6, int arg7, int arg8, int[] arg9, int[] arg10) {
		int var12 = 256 - arg6;
		for (int var13 = -arg8; var13 < 0; var13++) {
			for (int var14 = -arg0; var14 < 0; var14++) {
				int var15 = arg10[arg4++];
				if (var15 == 0) {
					arg7++;
				} else {
					int var16 = arg9[arg7];
					arg9[arg7++] = ((var15 & 0xFF00FF) * arg6 + (var16 & 0xFF00FF) * var12 & 0xFF00FF00) + ((var15 & 0xFF00) * arg6 + (var16 & 0xFF00) * var12 & 0xFF0000) >> 8;
				}
			}
			arg7 += arg3;
			arg4 += arg1;
		}
	}

	@ObfuscatedName("EPQDEJTO.a(IIIII[IIII[II)V")
	public void drawRotatedMasked(int arg0, int arg2, int arg3, int arg4, int[] arg5, int arg6, int arg7, int arg8, int[] arg9, int arg10) {
		try {
			int var13 = -arg4 / 2;
			int var14 = -arg2 / 2;
			int var15 = (int) (Math.sin((double) arg7 / 326.11D) * 65536.0D);
			int var16 = (int) (Math.cos((double) arg7 / 326.11D) * 65536.0D);
			int var17 = arg8 * var15 >> 8;
			int var18 = arg8 * var16 >> 8;
			int var19 = (arg3 << 16) + var13 * var18 + var14 * var17;
			int var20 = (arg10 << 16) + (var14 * var18 - var13 * var17);
			int var21 = Pix2D.width2d * arg0 + arg6;
			for (int var22 = 0; var22 < arg2; var22++) {
				int var23 = arg9[var22];
				int var24 = var21 + var23;
				int var25 = var18 * var23 + var19;
				int var26 = var20 - var17 * var23;
				for (int var27 = -arg5[var22]; var27 < 0; var27++) {
					Pix2D.data[var24++] = this.pixels[(var25 >> 16) + (var26 >> 16) * this.wi];
					var25 += var18;
					var26 -= var17;
				}
				var19 += var17;
				var20 += var18;
				var21 += Pix2D.width2d;
			}
		} catch (Exception var28) {
		}
	}

	@ObfuscatedName("EPQDEJTO.a(IIIIIIIDI)V")
	public void drawRotated(int arg0, int arg1, int arg2, int arg3, int arg4, int arg6, double arg7, int arg8) {
		try {
			int var11 = -arg6 / 2;
			int var12 = -arg4 / 2;
			int var13 = (int) (Math.sin(arg7) * 65536.0D);
			int var14 = (int) (Math.cos(arg7) * 65536.0D);
			int var15 = arg0 * var13 >> 8;
			int var16 = arg0 * var14 >> 8;
			int var17 = (arg1 << 16) + var11 * var16 + var12 * var15;
			int var18 = (arg3 << 16) + (var12 * var16 - var11 * var15);
			int var19 = Pix2D.width2d * arg8 + arg2;
			for (int var20 = 0; var20 < arg4; var20++) {
				int var21 = var19;
				int var22 = var17;
				int var23 = var18;
				for (int var24 = -arg6; var24 < 0; var24++) {
					int var25 = this.pixels[(var22 >> 16) + (var23 >> 16) * this.wi];
					if (var25 == 0) {
						var21++;
					} else {
						Pix2D.data[var21++] = var25;
					}
					var22 += var16;
					var23 -= var15;
				}
				var17 += var15;
				var18 += var16;
				var19 += Pix2D.width2d;
			}
		} catch (Exception var26) {
		}
	}

	@ObfuscatedName("EPQDEJTO.a(LWRRBQEHV;III)V")
	public void drawMasked(Pix8 arg0, int arg1, int arg3) {
		int var5 = this.xof + arg3;
		int var6 = this.yof + arg1;
		int var7 = Pix2D.width2d * var6 + var5;
		int var8 = 0;
		int var9 = this.hi;
		int var10 = this.wi;
		int var11 = Pix2D.width2d - var10;
		int var12 = 0;
		if (var6 < Pix2D.top) {
			int var13 = Pix2D.top - var6;
			var9 -= var13;
			var6 = Pix2D.top;
			var8 += var10 * var13;
			var7 += Pix2D.width2d * var13;
		}
		if (var6 + var9 > Pix2D.bottom) {
			var9 -= var6 + var9 - Pix2D.bottom;
		}
		if (var5 < Pix2D.left) {
			int var14 = Pix2D.left - var5;
			var10 -= var14;
			var5 = Pix2D.left;
			var8 += var14;
			var7 += var14;
			var12 += var14;
			var11 += var14;
		}
		if (var5 + var10 > Pix2D.right) {
			int var15 = var5 + var10 - Pix2D.right;
			var10 -= var15;
			var12 += var15;
			var11 += var15;
		}
		if (var10 > 0 && var9 > 0) {
			this.copyPixelsMasked(var7, var11, this.pixels, var10, Pix2D.data, arg0.pixels, var9, var8, 0, var12);
		}
	}

	@ObfuscatedName("EPQDEJTO.a(II[II[I[BIIIII)V")
	public void copyPixelsMasked(int arg0, int arg1, int[] arg2, int arg3, int[] arg4, byte[] arg5, int arg7, int arg8, int arg9, int arg10) {
		int var12 = -(arg3 >> 2);
		int var13 = -(arg3 & 0x3);
		for (int var14 = -arg7; var14 < 0; var14++) {
			for (int var15 = var12; var15 < 0; var15++) {
				int var18 = arg2[arg8++];
				if (var18 != 0 && arg5[arg0] == 0) {
					arg4[arg0++] = var18;
				} else {
					arg0++;
				}
				int var19 = arg2[arg8++];
				if (var19 != 0 && arg5[arg0] == 0) {
					arg4[arg0++] = var19;
				} else {
					arg0++;
				}
				int var20 = arg2[arg8++];
				if (var20 != 0 && arg5[arg0] == 0) {
					arg4[arg0++] = var20;
				} else {
					arg0++;
				}
				int var21 = arg2[arg8++];
				if (var21 != 0 && arg5[arg0] == 0) {
					arg4[arg0++] = var21;
				} else {
					arg0++;
				}
			}
			for (int var16 = var13; var16 < 0; var16++) {
				int var17 = arg2[arg8++];
				if (var17 != 0 && arg5[arg0] == 0) {
					arg4[arg0++] = var17;
				} else {
					arg0++;
				}
			}
			arg0 += arg1;
			arg8 += arg10;
		}
	}
}
