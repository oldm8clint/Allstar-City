package jagex2.sound;

import deob.ObfuscatedName;
import jagex2.io.Packet;

public class Tone {

	@ObfuscatedName("DXRZIVAQ.a")
	public byte field644 = 6;

	@ObfuscatedName("DXRZIVAQ.b")
	public int field645 = 8;

	@ObfuscatedName("DXRZIVAQ.k")
	public int[] field654 = new int[5];

	@ObfuscatedName("DXRZIVAQ.l")
	public int[] field655 = new int[5];

	@ObfuscatedName("DXRZIVAQ.m")
	public int[] field656 = new int[5];

	@ObfuscatedName("DXRZIVAQ.o")
	public int field658 = 100;

	@ObfuscatedName("DXRZIVAQ.r")
	public int field661 = 500;

	@ObfuscatedName("DXRZIVAQ.w")
	public static int[] field666 = new int[5];

	@ObfuscatedName("DXRZIVAQ.x")
	public static int[] field667 = new int[5];

	@ObfuscatedName("DXRZIVAQ.y")
	public static int[] field668 = new int[5];

	@ObfuscatedName("DXRZIVAQ.z")
	public static int[] field669 = new int[5];

	@ObfuscatedName("DXRZIVAQ.A")
	public static int[] field670 = new int[5];

	@ObfuscatedName("DXRZIVAQ.n")
	public int field657;

	@ObfuscatedName("DXRZIVAQ.s")
	public int field662;

	@ObfuscatedName("DXRZIVAQ.c")
	public Envelope field646;

	@ObfuscatedName("DXRZIVAQ.d")
	public Envelope field647;

	@ObfuscatedName("DXRZIVAQ.e")
	public Envelope field648;

	@ObfuscatedName("DXRZIVAQ.f")
	public Envelope field649;

	@ObfuscatedName("DXRZIVAQ.g")
	public Envelope field650;

	@ObfuscatedName("DXRZIVAQ.h")
	public Envelope field651;

	@ObfuscatedName("DXRZIVAQ.i")
	public Envelope field652;

	@ObfuscatedName("DXRZIVAQ.j")
	public Envelope field653;

	@ObfuscatedName("DXRZIVAQ.q")
	public Envelope field660;

	@ObfuscatedName("DXRZIVAQ.p")
	public Filter field659;

	@ObfuscatedName("DXRZIVAQ.t")
	public static int[] field663;

	@ObfuscatedName("DXRZIVAQ.u")
	public static int[] field664;

	@ObfuscatedName("DXRZIVAQ.v")
	public static int[] field665;

	@ObfuscatedName("DXRZIVAQ.a()V")
	public static void method186() {
		field664 = new int[32768];
		for (int var0 = 0; var0 < 32768; var0++) {
			if (Math.random() > 0.5D) {
				field664[var0] = 1;
			} else {
				field664[var0] = -1;
			}
		}
		field665 = new int[32768];
		for (int var1 = 0; var1 < 32768; var1++) {
			field665[var1] = (int) (Math.sin((double) var1 / 5215.1903D) * 16384.0D);
		}
		field663 = new int[220500];
	}

	@ObfuscatedName("DXRZIVAQ.a(II)[I")
	public int[] method187(int arg0, int arg1) {
		for (int var3 = 0; var3 < arg0; var3++) {
			field663[var3] = 0;
		}
		if (arg1 < 10) {
			return field663;
		}
		double var4 = (double) arg0 / ((double) arg1 + 0.0D);
		this.field646.method443(true);
		this.field647.method443(true);
		int var6 = 0;
		int var7 = 0;
		int var8 = 0;
		if (this.field648 != null) {
			this.field648.method443(true);
			this.field649.method443(true);
			var6 = (int) ((double) (this.field648.field1350 - this.field648.field1349) * 32.768D / var4);
			var7 = (int) ((double) this.field648.field1349 * 32.768D / var4);
		}
		int var9 = 0;
		int var10 = 0;
		int var11 = 0;
		if (this.field650 != null) {
			this.field650.method443(true);
			this.field651.method443(true);
			var9 = (int) ((double) (this.field650.field1350 - this.field650.field1349) * 32.768D / var4);
			var10 = (int) ((double) this.field650.field1349 * 32.768D / var4);
		}
		for (int var12 = 0; var12 < 5; var12++) {
			if (this.field654[var12] != 0) {
				field666[var12] = 0;
				field667[var12] = (int) ((double) this.field656[var12] * var4);
				field668[var12] = (this.field654[var12] << 14) / 100;
				field669[var12] = (int) ((double) (this.field646.field1350 - this.field646.field1349) * 32.768D * Math.pow(1.0057929410678534D, (double) this.field655[var12]) / var4);
				field670[var12] = (int) ((double) this.field646.field1349 * 32.768D / var4);
			}
		}
		for (int var13 = 0; var13 < arg0; var13++) {
			int var41 = this.field646.method444(0, arg0);
			int var42 = this.field647.method444(0, arg0);
			if (this.field648 != null) {
				int var43 = this.field648.method444(0, arg0);
				int var44 = this.field649.method444(0, arg0);
				var41 += this.method188(-887, var8, this.field648.field1351, var44) >> 1;
				var8 += (var6 * var43 >> 16) + var7;
			}
			if (this.field650 != null) {
				int var45 = this.field650.method444(0, arg0);
				int var46 = this.field651.method444(0, arg0);
				var42 = var42 * ((this.method188(-887, var11, this.field650.field1351, var46) >> 1) + 32768) >> 15;
				var11 += (var9 * var45 >> 16) + var10;
			}
			for (int var47 = 0; var47 < 5; var47++) {
				if (this.field654[var47] != 0) {
					int var48 = field667[var47] + var13;
					if (var48 < arg0) {
						field663[var48] += this.method188(-887, field666[var47], this.field646.field1351, field668[var47] * var42 >> 15);
						field666[var47] += (field669[var47] * var41 >> 16) + field670[var47];
					}
				}
			}
		}
		if (this.field652 != null) {
			this.field652.method443(true);
			this.field653.method443(true);
			int var14 = 0;
			boolean var15 = false;
			boolean var16 = true;
			for (int var17 = 0; var17 < arg0; var17++) {
				int var18 = this.field652.method444(0, arg0);
				int var19 = this.field653.method444(0, arg0);
				int var20;
				if (var16) {
					var20 = ((this.field652.field1350 - this.field652.field1349) * var18 >> 8) + this.field652.field1349;
				} else {
					var20 = ((this.field652.field1350 - this.field652.field1349) * var19 >> 8) + this.field652.field1349;
				}
				var14 += 256;
				if (var14 >= var20) {
					var14 = 0;
					var16 = !var16;
				}
				if (var16) {
					field663[var17] = 0;
				}
			}
		}
		if (this.field657 > 0 && this.field658 > 0) {
			int var21 = (int) ((double) this.field657 * var4);
			for (int var22 = var21; var22 < arg0; var22++) {
				field663[var22] += field663[var22 - var21] * this.field658 / 100;
			}
		}
		if (this.field659.field1416[0] > 0 || this.field659.field1416[1] > 0) {
			this.field660.method443(true);
			int var23 = this.field660.method444(0, arg0 + 1);
			int var24 = this.field659.method468(0, true, (float) var23 / 65536.0F);
			int var25 = this.field659.method468(1, true, (float) var23 / 65536.0F);
			if (arg0 >= var24 + var25) {
				int var26 = 0;
				int var27 = var25;
				if (var25 > arg0 - var24) {
					var27 = arg0 - var24;
				}
				while (var26 < var27) {
					int var37 = (int) ((long) field663[var24 + var26] * (long) Filter.field1423 >> 16);
					for (int var38 = 0; var38 < var24; var38++) {
						var37 += (int) ((long) field663[var24 + var26 - 1 - var38] * (long) Filter.field1421[0][var38] >> 16);
					}
					for (int var39 = 0; var39 < var26; var39++) {
						var37 -= (int) ((long) field663[var26 - 1 - var39] * (long) Filter.field1421[1][var39] >> 16);
					}
					field663[var26] = var37;
					var23 = this.field660.method444(0, arg0 + 1);
					var26++;
				}
				short var28 = 128;
				int var29 = var28;
				while (true) {
					if (var29 > arg0 - var24) {
						var29 = arg0 - var24;
					}
					while (var26 < var29) {
						int var34 = (int) ((long) field663[var24 + var26] * (long) Filter.field1423 >> 16);
						for (int var35 = 0; var35 < var24; var35++) {
							var34 += (int) ((long) field663[var24 + var26 - 1 - var35] * (long) Filter.field1421[0][var35] >> 16);
						}
						for (int var36 = 0; var36 < var25; var36++) {
							var34 -= (int) ((long) field663[var26 - 1 - var36] * (long) Filter.field1421[1][var36] >> 16);
						}
						field663[var26] = var34;
						var23 = this.field660.method444(0, arg0 + 1);
						var26++;
					}
					if (var26 >= arg0 - var24) {
						while (var26 < arg0) {
							int var30 = 0;
							for (int var31 = var24 + var26 - arg0; var31 < var24; var31++) {
								var30 += (int) ((long) field663[var24 + var26 - 1 - var31] * (long) Filter.field1421[0][var31] >> 16);
							}
							for (int var32 = 0; var32 < var25; var32++) {
								var30 -= (int) ((long) field663[var26 - 1 - var32] * (long) Filter.field1421[1][var32] >> 16);
							}
							field663[var26] = var30;
							this.field660.method444(0, arg0 + 1);
							var26++;
						}
						break;
					}
					var24 = this.field659.method468(0, true, (float) var23 / 65536.0F);
					var25 = this.field659.method468(1, true, (float) var23 / 65536.0F);
					var29 += var28;
				}
			}
		}
		for (int var40 = 0; var40 < arg0; var40++) {
			if (field663[var40] < -32768) {
				field663[var40] = -32768;
			}
			if (field663[var40] > 32767) {
				field663[var40] = 32767;
			}
		}
		return field663;
	}

	@ObfuscatedName("DXRZIVAQ.a(IIII)I")
	public int method188(int arg0, int arg1, int arg2, int arg3) {
		while (arg0 >= 0) {
			this.field645 = -409;
		}
		if (arg2 == 1) {
			if ((arg1 & 0x7FFF) < 16384) {
				return arg3;
			} else {
				return -arg3;
			}
		} else if (arg2 == 2) {
			return field665[arg1 & 0x7FFF] * arg3 >> 14;
		} else if (arg2 == 3) {
			return ((arg1 & 0x7FFF) * arg3 >> 14) - arg3;
		} else if (arg2 == 4) {
			return field664[arg1 / 2607 & 0x7FFF] * arg3;
		} else {
			return 0;
		}
	}

	@ObfuscatedName("DXRZIVAQ.a(BLMFMVIYHT;)V")
	public void method189(byte arg0, Packet arg1) {
		this.field646 = new Envelope();
		this.field646.method441(this.field644, arg1);
		this.field647 = new Envelope();
		this.field647.method441(this.field644, arg1);
		int var3 = arg1.g1();
		if (var3 != 0) {
			arg1.pos--;
			this.field648 = new Envelope();
			this.field648.method441(this.field644, arg1);
			this.field649 = new Envelope();
			this.field649.method441(this.field644, arg1);
		}
		int var4 = arg1.g1();
		if (arg0 != 6) {
			for (int var5 = 1; var5 > 0; var5++) {
			}
		}
		if (var4 != 0) {
			arg1.pos--;
			this.field650 = new Envelope();
			this.field650.method441(this.field644, arg1);
			this.field651 = new Envelope();
			this.field651.method441(this.field644, arg1);
		}
		int var6 = arg1.g1();
		if (var6 != 0) {
			arg1.pos--;
			this.field652 = new Envelope();
			this.field652.method441(this.field644, arg1);
			this.field653 = new Envelope();
			this.field653.method441(this.field644, arg1);
		}
		for (int var7 = 0; var7 < 10; var7++) {
			int var8 = arg1.gsmarts();
			if (var8 == 0) {
				break;
			}
			this.field654[var7] = var8;
			this.field655[var7] = arg1.gsmart();
			this.field656[var7] = arg1.gsmarts();
		}
		this.field657 = arg1.gsmarts();
		this.field658 = arg1.gsmarts();
		this.field661 = arg1.g2();
		this.field662 = arg1.g2();
		this.field659 = new Filter();
		this.field660 = new Envelope();
		this.field659.method469(-954, this.field660, arg1);
	}
}
