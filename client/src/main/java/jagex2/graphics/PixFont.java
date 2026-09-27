package jagex2.graphics;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;
import java.util.Random;

public class PixFont extends Pix2D {

	@ObfuscatedName("JDPYRDAS.A")
	public byte[][] charMask = new byte[256][];

	@ObfuscatedName("JDPYRDAS.B")
	public int[] charMaskWidth = new int[256];

	@ObfuscatedName("JDPYRDAS.C")
	public int[] charMaskHeight = new int[256];

	@ObfuscatedName("JDPYRDAS.D")
	public int[] charOffsetX = new int[256];

	@ObfuscatedName("JDPYRDAS.E")
	public int[] charOffsetY = new int[256];

	@ObfuscatedName("JDPYRDAS.F")
	public int[] charAdvance = new int[256];

	@ObfuscatedName("JDPYRDAS.H")
	public Random rand = new Random();

	@ObfuscatedName("JDPYRDAS.I")
	public boolean strikeout = false;

	@ObfuscatedName("JDPYRDAS.G")
	public int height;

	public PixFont(boolean quill, Jagfile jag, String name) {
		Packet data = new Packet(jag.read(name + ".dat", null));
		Packet index = new Packet(jag.read("index.dat", null));
		index.pos = data.g2() + 4;

		int palCount = index.g1();
		if (palCount > 0) {
			index.pos += (palCount - 1) * 3;
		}

		for (int c = 0; c < 256; c++) {
			this.charOffsetX[c] = index.g1();
			this.charOffsetY[c] = index.g1();
			int wi = this.charMaskWidth[c] = index.g2();
			int hi = this.charMaskHeight[c] = index.g2();
			int pixelOrder = index.g1();

			int len = wi * hi;
			this.charMask[c] = new byte[len];

			if (pixelOrder == 0) {
				for (int i = 0; i < len; i++) {
					this.charMask[c][i] = data.g1b();
				}
			} else if (pixelOrder == 1) {
				for (int x = 0; x < wi; x++) {
					for (int y = 0; y < hi; y++) {
						this.charMask[c][wi * y + x] = data.g1b();
					}
				}
			}

			if (hi > this.height && c < 128) {
				this.height = hi;
			}

			this.charOffsetX[c] = 1;
			this.charAdvance[c] = wi + 2;

			int space = 0;
			for (int y = hi / 7; y < hi; y++) {
				space += this.charMask[c][wi * y];
			}

			if (space <= hi / 7) {
				this.charAdvance[c]--;
				this.charOffsetX[c] = 0;
			}

			space = 0;
			for (int y = hi / 7; y < hi; y++) {
				space += this.charMask[c][wi * y + (wi - 1)];
			}

			if (space <= hi / 7) {
				this.charAdvance[c]--;
			}
		}

		if (quill) {
			this.charAdvance[32] = this.charAdvance[73];
		} else {
			this.charAdvance[32] = this.charAdvance[105];
		}
	}

	@ObfuscatedName("JDPYRDAS.a(ZLjava/lang/String;III)V")
	public void method243(String arg1, int arg2, int arg3, int arg4) {
		this.drawString(arg3 - this.stringWid(arg1), arg2, arg4, arg1);
	}

	@ObfuscatedName("JDPYRDAS.a(IIIILjava/lang/String;)V")
	public void centreString(int arg0, int arg2, int arg3, String arg4) {
		this.drawString(arg0 - this.stringWid(arg4) / 2, arg3, arg2, arg4);
	}

	@ObfuscatedName("JDPYRDAS.a(ZIIIILjava/lang/String;)V")
	public void centreStringTag(boolean arg0, int arg2, int arg3, int arg4, String arg5) {
		this.drawStringTag(arg2, arg4 - this.stringWidTag(arg5) / 2, arg3, arg0, arg5);
	}

	@ObfuscatedName("JDPYRDAS.a(BLjava/lang/String;)I")
	public int stringWidTag(String str) {
		if (str == null) {
			return 0;
		}

		int size = 0;
		for (int c = 0; c < str.length(); c++) {
			if (str.charAt(c) == '@' && c + 4 < str.length() && str.charAt(c + 4) == '@') {
				c += 4;
			} else {
				size += this.charAdvance[str.charAt(c)];
			}
		}

		return size;
	}

	@ObfuscatedName("JDPYRDAS.a(Ljava/lang/String;B)I")
	public int stringWid(String str) {
		if (str == null) {
			return 0;
		}

		int size = 0;
		for (int c = 0; c < str.length(); c++) {
			size += this.charAdvance[str.charAt(c)];
		}

		return size;
	}

	@ObfuscatedName("JDPYRDAS.b(IIIILjava/lang/String;)V")
	public void drawString(int arg1, int arg2, int arg3, String arg4) {
		if (arg4 == null) {
			return;
		}

		int var7 = arg3 - this.height;
		for (int var8 = 0; var8 < arg4.length(); var8++) {
			char c = arg4.charAt(var8);
			if (c != ' ') {
				this.plotLetter(this.charMask[c], this.charOffsetX[c] + arg1, this.charOffsetY[c] + var7, this.charMaskWidth[c], this.charMaskHeight[c], arg2);
			}
			arg1 += this.charAdvance[c];
		}
	}

	@ObfuscatedName("JDPYRDAS.a(IBILjava/lang/String;II)V")
	public void centreStringWave(int arg0, int arg2, String arg3, int arg4, int arg5) {
		if (arg3 == null) {
			return;
		}
		int var7 = arg4 - this.stringWid(arg3) / 2;
		int var9 = arg0 - this.height;
		for (int var10 = 0; var10 < arg3.length(); var10++) {
			char var11 = arg3.charAt(var10);
			if (var11 != ' ') {
				this.plotLetter(this.charMask[var11], this.charOffsetX[var11] + var7, this.charOffsetY[var11] + var9 + (int) (Math.sin((double) arg2 / 5.0D + (double) var10 / 2.0D) * 5.0D), this.charMaskWidth[var11], this.charMaskHeight[var11], arg5);
			}
			var7 += this.charAdvance[var11];
		}
	}

	@ObfuscatedName("JDPYRDAS.a(IIBLjava/lang/String;II)V")
	public void centreStringWave2(int arg0, int arg1, String arg3, int arg4, int arg5) {
		if (arg3 == null) {
			return;
		}
		int var7 = arg4 - this.stringWid(arg3) / 2;
		int var9 = arg0 - this.height;
		for (int var10 = 0; var10 < arg3.length(); var10++) {
			char var11 = arg3.charAt(var10);
			if (var11 != ' ') {
				this.plotLetter(this.charMask[var11], this.charOffsetX[var11] + var7 + (int) (Math.sin((double) arg5 / 5.0D + (double) var10 / 5.0D) * 5.0D), this.charOffsetY[var11] + var9 + (int) (Math.sin((double) arg5 / 5.0D + (double) var10 / 3.0D) * 5.0D), this.charMaskWidth[var11], this.charMaskHeight[var11], arg1);
			}
			var7 += this.charAdvance[var11];
		}
	}

	@ObfuscatedName("JDPYRDAS.a(ILjava/lang/String;IIIII)V")
	public void centreStringShake(String arg1, int arg2, int arg3, int arg4, int arg5, int arg6) {
		if (arg1 == null) {
			return;
		}
		double var8 = 7.0D - (double) arg5 / 8.0D;
		if (var8 < 0.0D) {
			var8 = 0.0D;
		}
		int var10 = arg3 - this.stringWid(arg1) / 2;
		int var11 = arg4 - this.height;
		for (int var12 = 0; var12 < arg1.length(); var12++) {
			char var13 = arg1.charAt(var12);
			if (var13 != ' ') {
				this.plotLetter(this.charMask[var13], this.charOffsetX[var13] + var10, this.charOffsetY[var13] + var11 + (int) (Math.sin((double) var12 / 1.5D + (double) arg6) * var8), this.charMaskWidth[var13], this.charMaskHeight[var13], arg2);
			}
			var10 += this.charAdvance[var13];
		}
	}

	@ObfuscatedName("JDPYRDAS.a(IIIZLjava/lang/String;I)V")
	public void drawStringTag(int arg0, int arg1, int arg2, boolean arg3, String arg4) {
		this.strikeout = false;
		int var7 = arg1;
		if (arg4 == null) {
			return;
		}
		int var8 = arg2 - this.height;
		for (int var9 = 0; var9 < arg4.length(); var9++) {
			if (arg4.charAt(var9) == '@' && var9 + 4 < arg4.length() && arg4.charAt(var9 + 4) == '@') {
				int var10 = this.evaluateTag(arg4.substring(var9 + 1, var9 + 4));
				if (var10 != -1) {
					arg0 = var10;
				}
				var9 += 4;
			} else {
				char var11 = arg4.charAt(var9);
				if (var11 != ' ') {
					if (arg3) {
						this.plotLetter(this.charMask[var11], this.charOffsetX[var11] + arg1 + 1, this.charOffsetY[var11] + var8 + 1, this.charMaskWidth[var11], this.charMaskHeight[var11], 0);
					}
					this.plotLetter(this.charMask[var11], this.charOffsetX[var11] + arg1, this.charOffsetY[var11] + var8, this.charMaskWidth[var11], this.charMaskHeight[var11], arg0);
				}
				arg1 += this.charAdvance[var11];
			}
		}
		if (this.strikeout) {
			Pix2D.hline(var7, 8388608, (int) ((double) this.height * 0.7D) + var8, arg1 - var7);
		}
	}

	@ObfuscatedName("JDPYRDAS.a(ZIIIILjava/lang/String;I)V")
	public void drawStringAntiMacro(boolean arg0, int arg1, int arg2, int arg3, int arg4, String arg5) {
		if (arg5 == null) {
			return;
		}
		this.rand.setSeed((long) arg1);
		int var8 = (this.rand.nextInt() & 0x1F) + 192;
		int var9 = arg4 - this.height;
		for (int var10 = 0; var10 < arg5.length(); var10++) {
			if (arg5.charAt(var10) == '@' && var10 + 4 < arg5.length() && arg5.charAt(var10 + 4) == '@') {
				int var11 = this.evaluateTag(arg5.substring(var10 + 1, var10 + 4));
				if (var11 != -1) {
					arg3 = var11;
				}
				var10 += 4;
			} else {
				char var12 = arg5.charAt(var10);
				if (var12 != ' ') {
					if (arg0) {
						this.plotLetterTrans(this.charOffsetX[var12] + arg2 + 1, 0, this.charMask[var12], this.charOffsetY[var12] + var9 + 1, this.charMaskHeight[var12], this.charMaskWidth[var12], 192);
					}
					this.plotLetterTrans(this.charOffsetX[var12] + arg2, arg3, this.charMask[var12], this.charOffsetY[var12] + var9, this.charMaskHeight[var12], this.charMaskWidth[var12], var8);
				}
				arg2 += this.charAdvance[var12];
				if ((this.rand.nextInt() & 0x3) == 0) {
					arg2++;
				}
			}
		}
	}

	@ObfuscatedName("JDPYRDAS.a(ILjava/lang/String;)I")
	public int evaluateTag(String tag) {
		if (tag.equals("red")) {
			return 16711680;
		} else if (tag.equals("gre")) {
			return 65280;
		} else if (tag.equals("blu")) {
			return 255;
		} else if (tag.equals("yel")) {
			return 16776960;
		} else if (tag.equals("cya")) {
			return 65535;
		} else if (tag.equals("mag")) {
			return 16711935;
		} else if (tag.equals("whi")) {
			return 16777215;
		} else if (tag.equals("bla")) {
			return 0;
		} else if (tag.equals("lre")) {
			return 16748608;
		} else if (tag.equals("dre")) {
			return 8388608;
		} else if (tag.equals("dbl")) {
			return 128;
		} else if (tag.equals("or1")) {
			return 16756736;
		} else if (tag.equals("or2")) {
			return 16740352;
		} else if (tag.equals("or3")) {
			return 16723968;
		} else if (tag.equals("gr1")) {
			return 12648192;
		} else if (tag.equals("gr2")) {
			return 8453888;
		} else if (tag.equals("gr3")) {
			return 4259584;
		} else {
			if (tag.equals("str")) {
				this.strikeout = true;
			}
			if (tag.equals("end")) {
				this.strikeout = false;
			}
			return -1;
		}
	}

	@ObfuscatedName("JDPYRDAS.a([BIIIII)V")
	public void plotLetter(byte[] arg0, int arg1, int arg2, int arg3, int arg4, int arg5) {
		int var7 = Pix2D.width2d * arg2 + arg1;
		int var8 = Pix2D.width2d - arg3;
		int var9 = 0;
		int var10 = 0;
		if (arg2 < Pix2D.top) {
			int var11 = Pix2D.top - arg2;
			arg4 -= var11;
			arg2 = Pix2D.top;
			var10 += arg3 * var11;
			var7 += Pix2D.width2d * var11;
		}
		if (arg2 + arg4 >= Pix2D.bottom) {
			arg4 -= arg2 + arg4 - Pix2D.bottom + 1;
		}
		if (arg1 < Pix2D.left) {
			int var12 = Pix2D.left - arg1;
			arg3 -= var12;
			arg1 = Pix2D.left;
			var10 += var12;
			var7 += var12;
			var9 += var12;
			var8 += var12;
		}
		if (arg1 + arg3 >= Pix2D.right) {
			int var13 = arg1 + arg3 - Pix2D.right + 1;
			arg3 -= var13;
			var9 += var13;
			var8 += var13;
		}
		if (arg3 > 0 && arg4 > 0) {
			this.plotLetterInner(Pix2D.data, arg0, arg5, var10, var7, arg3, arg4, var8, var9);
		}
	}

	@ObfuscatedName("JDPYRDAS.a([I[BIIIIIII)V")
	public void plotLetterInner(int[] arg0, byte[] arg1, int arg2, int arg3, int arg4, int arg5, int arg6, int arg7, int arg8) {
		int var10 = -(arg5 >> 2);
		int var11 = -(arg5 & 0x3);
		for (int var12 = -arg6; var12 < 0; var12++) {
			for (int var13 = var10; var13 < 0; var13++) {
				if (arg1[arg3++] == 0) {
					arg4++;
				} else {
					arg0[arg4++] = arg2;
				}
				if (arg1[arg3++] == 0) {
					arg4++;
				} else {
					arg0[arg4++] = arg2;
				}
				if (arg1[arg3++] == 0) {
					arg4++;
				} else {
					arg0[arg4++] = arg2;
				}
				if (arg1[arg3++] == 0) {
					arg4++;
				} else {
					arg0[arg4++] = arg2;
				}
			}
			for (int var14 = var11; var14 < 0; var14++) {
				if (arg1[arg3++] == 0) {
					arg4++;
				} else {
					arg0[arg4++] = arg2;
				}
			}
			arg4 += arg7;
			arg3 += arg8;
		}
	}

	@ObfuscatedName("JDPYRDAS.a(IZI[BIIII)V")
	public void plotLetterTrans(int arg0, int arg2, byte[] arg3, int arg4, int arg5, int arg6, int arg7) {
		int var9 = Pix2D.width2d * arg4 + arg0;
		int var10 = Pix2D.width2d - arg6;
		int var11 = 0;
		int var12 = 0;
		if (arg4 < Pix2D.top) {
			int var13 = Pix2D.top - arg4;
			arg5 -= var13;
			arg4 = Pix2D.top;
			var12 += arg6 * var13;
			var9 += Pix2D.width2d * var13;
		}
		if (arg4 + arg5 >= Pix2D.bottom) {
			arg5 -= arg4 + arg5 - Pix2D.bottom + 1;
		}
		if (arg0 < Pix2D.left) {
			int var14 = Pix2D.left - arg0;
			arg6 -= var14;
			arg0 = Pix2D.left;
			var12 += var14;
			var9 += var14;
			var11 += var14;
			var10 += var14;
		}
		if (arg0 + arg6 >= Pix2D.right) {
			int var15 = arg0 + arg6 - Pix2D.right + 1;
			arg6 -= var15;
			var11 += var15;
			var10 += var15;
		}
		if (arg6 > 0 && arg5 > 0) {
			this.plotLetterTransInner(var12, var10, var11, var9, arg7, Pix2D.data, arg2, arg5, arg6, arg3);
		}
	}

	@ObfuscatedName("JDPYRDAS.a(IIIII[IIIII[B)V")
	public void plotLetterTransInner(int arg0, int arg1, int arg2, int arg3, int arg4, int[] arg5, int arg6, int arg8, int arg9, byte[] arg10) {
		int var12 = ((arg6 & 0xFF00FF) * arg4 & 0xFF00FF00) + ((arg6 & 0xFF00) * arg4 & 0xFF0000) >> 8;
		int var13 = 256 - arg4;
		for (int var14 = -arg8; var14 < 0; var14++) {
			for (int var15 = -arg9; var15 < 0; var15++) {
				if (arg10[arg0++] == 0) {
					arg3++;
				} else {
					int var16 = arg5[arg3];
					arg5[arg3++] = (((var16 & 0xFF00FF) * var13 & 0xFF00FF00) + ((var16 & 0xFF00) * var13 & 0xFF0000) >> 8) + var12;
				}
			}
			arg3 += arg1;
			arg0 += arg2;
		}
	}
}
