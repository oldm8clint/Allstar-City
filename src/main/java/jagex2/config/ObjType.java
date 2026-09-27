package jagex2.config;

import deob.ObfuscatedName;
import jagex2.dash3d.Model;
import jagex2.datastruct.LruCache;
import jagex2.graphics.Pix2D;
import jagex2.graphics.Pix32;
import jagex2.graphics.Pix3D;
import jagex2.io.Jagfile;
import jagex2.io.Packet;

public class ObjType {

	@ObfuscatedName("GSCQQEUA.L")
	public int field845 = -1;

	@ObfuscatedName("GSCQQEUA.l")
	public static LruCache field819 = new LruCache(50);

	@ObfuscatedName("GSCQQEUA.s")
	public static boolean membersWorld = true;

	@ObfuscatedName("GSCQQEUA.u")
	public static LruCache field828 = new LruCache(100);

	@ObfuscatedName("GSCQQEUA.e")
	public byte field812;

	@ObfuscatedName("GSCQQEUA.ab")
	public byte field860;

	@ObfuscatedName("GSCQQEUA.a")
	public int field808;

	@ObfuscatedName("GSCQQEUA.b")
	public int field809;

	@ObfuscatedName("GSCQQEUA.f")
	public int field813;

	@ObfuscatedName("GSCQQEUA.g")
	public int field814;

	@ObfuscatedName("GSCQQEUA.h")
	public int field815;

	@ObfuscatedName("GSCQQEUA.i")
	public int field816;

	@ObfuscatedName("GSCQQEUA.j")
	public static int field817;

	@ObfuscatedName("GSCQQEUA.n")
	public int field821;

	@ObfuscatedName("GSCQQEUA.o")
	public int field822;

	@ObfuscatedName("GSCQQEUA.r")
	public int field825;

	@ObfuscatedName("GSCQQEUA.t")
	public int field827;

	@ObfuscatedName("GSCQQEUA.A")
	public static int field834;

	@ObfuscatedName("GSCQQEUA.B")
	public int field835;

	@ObfuscatedName("GSCQQEUA.C")
	public int ambient;

	@ObfuscatedName("GSCQQEUA.D")
	public int field837;

	@ObfuscatedName("GSCQQEUA.E")
	public int field838;

	@ObfuscatedName("GSCQQEUA.F")
	public int field839;

	@ObfuscatedName("GSCQQEUA.G")
	public int contrast;

	@ObfuscatedName("GSCQQEUA.H")
	public int field841;

	@ObfuscatedName("GSCQQEUA.I")
	public int field842;

	@ObfuscatedName("GSCQQEUA.J")
	public int field843;

	@ObfuscatedName("GSCQQEUA.K")
	public int field844;

	@ObfuscatedName("GSCQQEUA.O")
	public int field848;

	@ObfuscatedName("GSCQQEUA.P")
	public int field849;

	@ObfuscatedName("GSCQQEUA.Q")
	public int field850;

	@ObfuscatedName("GSCQQEUA.R")
	public int field851;

	@ObfuscatedName("GSCQQEUA.S")
	public int field852;

	@ObfuscatedName("GSCQQEUA.U")
	public int field854;

	@ObfuscatedName("GSCQQEUA.X")
	public int field857;

	@ObfuscatedName("GSCQQEUA.V")
	public static Packet field855;

	@ObfuscatedName("GSCQQEUA.d")
	public String field811;

	@ObfuscatedName("GSCQQEUA.T")
	public boolean field853;

	@ObfuscatedName("GSCQQEUA.Z")
	public boolean field859;

	@ObfuscatedName("GSCQQEUA.c")
	public byte[] field810;

	@ObfuscatedName("GSCQQEUA.p")
	public int[] field823;

	@ObfuscatedName("GSCQQEUA.q")
	public static int[] field824;

	@ObfuscatedName("GSCQQEUA.M")
	public int[] field846;

	@ObfuscatedName("GSCQQEUA.N")
	public int[] field847;

	@ObfuscatedName("GSCQQEUA.Y")
	public int[] field858;

	@ObfuscatedName("GSCQQEUA.k")
	public static ObjType[] field818;

	@ObfuscatedName("GSCQQEUA.m")
	public String[] field820;

	@ObfuscatedName("GSCQQEUA.w")
	public String[] field830;

	@ObfuscatedName("GSCQQEUA.a(II)Z")
	public boolean method220(int arg0) {
		int var3 = this.field816;
		int var4 = this.field843;
		if (arg0 == 1) {
			var3 = this.field857;
			var4 = this.field844;
		}
		if (var3 == -1) {
			return true;
		}
		boolean var5 = true;
		if (!Model.method360(var3)) {
			var5 = false;
		}
		if (var4 != -1 && !Model.method360(var4)) {
			var5 = false;
		}
		return var5;
	}

	@ObfuscatedName("GSCQQEUA.a(I)LGSCQQEUA;")
	public static ObjType get(int arg0) {
		for (int var1 = 0; var1 < 10; var1++) {
			if (field818[var1].field845 == arg0) {
				return field818[var1];
			}
		}
		field834 = (field834 + 1) % 10;
		ObjType var2 = field818[field834];
		field855.pos = field824[arg0];
		var2.field845 = arg0;
		var2.method232();
		var2.method227(field855);
		if (var2.field825 != -1) {
			var2.method224();
		}
		if (!membersWorld && var2.field859) {
			var2.field811 = "Members Object";
			var2.field810 = "Login to a members' server to use this object.".getBytes();
			var2.field820 = null;
			var2.field830 = null;
			var2.field814 = 0;
		}
		return var2;
	}

	@ObfuscatedName("GSCQQEUA.a(BI)LLZYQDKJV;")
	public Model method222(int arg1) {
		int var3 = this.field835;
		int var4 = this.field813;
		int var5 = this.field852;
		if (arg1 == 1) {
			var3 = this.field808;
			var4 = this.field837;
			var5 = this.field849;
		}
		if (var3 == -1) {
			return null;
		}
		Model var6 = Model.tryGet(var3);
		if (var4 != -1) {
			if (var5 == -1) {
				Model var10 = Model.tryGet(var4);
				Model[] var11 = new Model[] { var6, var10 };
				var6 = new Model(2, var11, (byte) -89);
			} else {
				Model var7 = Model.tryGet(var4);
				Model var8 = Model.tryGet(var5);
				Model[] var9 = new Model[] { var6, var7, var8 };
				var6 = new Model(3, var9, (byte) -89);
			}
		}
		if (arg1 == 0 && this.field860 != 0) {
			var6.method372(0, 0, this.field860);
		}
		if (arg1 == 1 && this.field812 != 0) {
			var6.method372(0, 0, this.field812);
		}
		if (this.field846 != null) {
			for (int var12 = 0; var12 < this.field846.length; var12++) {
				var6.method373(this.field846[var12], this.field823[var12]);
			}
		}
		return var6;
	}

	@ObfuscatedName("GSCQQEUA.a(LATJMVOZR;)V")
	public static void unpack(Jagfile arg0) {
		field855 = new Packet(arg0.read("obj.dat", null));
		Packet var1 = new Packet(arg0.read("obj.idx", null));
		field817 = var1.g2();
		field824 = new int[field817];
		int var2 = 2;
		for (int var3 = 0; var3 < field817; var3++) {
			field824[var3] = var2;
			var2 += var1.g2();
		}
		field818 = new ObjType[10];
		for (int var4 = 0; var4 < 10; var4++) {
			field818[var4] = new ObjType();
		}
	}

	@ObfuscatedName("GSCQQEUA.b(I)V")
	public void method224() {
		ObjType var2 = get(this.field825);
		this.field842 = var2.field842;
		this.field851 = var2.field851;
		this.field841 = var2.field841;
		this.field838 = var2.field838;
		this.field821 = var2.field821;
		this.field809 = var2.field809;
		this.field822 = var2.field822;
		this.field846 = var2.field846;
		this.field823 = var2.field823;
		ObjType var4 = get(this.field815);
		this.field811 = var4.field811;
		this.field859 = var4.field859;
		this.field827 = var4.field827;
		String var5 = "a";
		char var6 = var4.field811.charAt(0);
		if (var6 == 'A' || var6 == 'E' || var6 == 'I' || var6 == 'O' || var6 == 'U') {
			var5 = "an";
		}
		this.field810 = ("Swap this note at any bank for " + var5 + " " + var4.field811 + ".").getBytes();
		this.field853 = true;
	}

	@ObfuscatedName("GSCQQEUA.b(II)Z")
	public boolean method225(int arg1) {
		int var3 = this.field835;
		int var4 = this.field813;
		int var5 = this.field852;
		if (arg1 == 1) {
			var3 = this.field808;
			var4 = this.field837;
			var5 = this.field849;
		}
		if (var3 == -1) {
			return true;
		}
		boolean var6 = true;
		if (!Model.method360(var3)) {
			var6 = false;
		}
		if (var4 != -1 && !Model.method360(var4)) {
			var6 = false;
		}
		if (var5 != -1 && !Model.method360(var5)) {
			var6 = false;
		}
		return var6;
	}

	@ObfuscatedName("GSCQQEUA.c(II)LLZYQDKJV;")
	public Model getInvModel(int arg1) {
		if (this.field847 != null && arg1 > 1) {
			int var3 = -1;
			for (int var4 = 0; var4 < 10; var4++) {
				if (arg1 >= this.field858[var4] && this.field858[var4] != 0) {
					var3 = this.field847[var4];
				}
			}
			if (var3 != -1) {
				return get(var3).getInvModel(1);
			}
		}
		Model var5 = Model.tryGet(this.field842);
		if (var5 == null) {
			return null;
		}
		if (this.field846 != null) {
			for (int var6 = 0; var6 < this.field846.length; var6++) {
				var5.method373(this.field846[var6], this.field823[var6]);
			}
		}
		return var5;
	}

	@ObfuscatedName("GSCQQEUA.a(BLMFMVIYHT;)V")
	public void method227(Packet arg1) {
		while (true) {
			int var3 = arg1.g1();
			if (var3 == 0) {
				return;
			}
			if (var3 == 1) {
				this.field842 = arg1.g2();
			} else if (var3 == 2) {
				this.field811 = arg1.gjstr();
			} else if (var3 == 3) {
				this.field810 = arg1.gjstrraw();
			} else if (var3 == 4) {
				this.field851 = arg1.g2();
			} else if (var3 == 5) {
				this.field841 = arg1.g2();
			} else if (var3 == 6) {
				this.field838 = arg1.g2();
			} else if (var3 == 7) {
				this.field809 = arg1.g2();
				if (this.field809 > 32767) {
					this.field809 -= 65536;
				}
			} else if (var3 == 8) {
				this.field822 = arg1.g2();
				if (this.field822 > 32767) {
					this.field822 -= 65536;
				}
			} else if (var3 == 10) {
				this.field854 = arg1.g2();
			} else if (var3 == 11) {
				this.field853 = true;
			} else if (var3 == 12) {
				this.field827 = arg1.g4();
			} else if (var3 == 16) {
				this.field859 = true;
			} else if (var3 == 23) {
				this.field835 = arg1.g2();
				this.field860 = arg1.g1b();
			} else if (var3 == 24) {
				this.field813 = arg1.g2();
			} else if (var3 == 25) {
				this.field808 = arg1.g2();
				this.field812 = arg1.g1b();
			} else if (var3 == 26) {
				this.field837 = arg1.g2();
			} else if (var3 >= 30 && var3 < 35) {
				if (this.field820 == null) {
					this.field820 = new String[5];
				}
				this.field820[var3 - 30] = arg1.gjstr();
				if (this.field820[var3 - 30].equalsIgnoreCase("hidden")) {
					this.field820[var3 - 30] = null;
				}
			} else if (var3 >= 35 && var3 < 40) {
				if (this.field830 == null) {
					this.field830 = new String[5];
				}
				this.field830[var3 - 35] = arg1.gjstr();
			} else if (var3 == 40) {
				int var4 = arg1.g1();
				this.field846 = new int[var4];
				this.field823 = new int[var4];
				for (int var5 = 0; var5 < var4; var5++) {
					this.field846[var5] = arg1.g2();
					this.field823[var5] = arg1.g2();
				}
			} else if (var3 == 78) {
				this.field852 = arg1.g2();
			} else if (var3 == 79) {
				this.field849 = arg1.g2();
			} else if (var3 == 90) {
				this.field816 = arg1.g2();
			} else if (var3 == 91) {
				this.field857 = arg1.g2();
			} else if (var3 == 92) {
				this.field843 = arg1.g2();
			} else if (var3 == 93) {
				this.field844 = arg1.g2();
			} else if (var3 == 95) {
				this.field821 = arg1.g2();
			} else if (var3 == 97) {
				this.field815 = arg1.g2();
			} else if (var3 == 98) {
				this.field825 = arg1.g2();
			} else if (var3 >= 100 && var3 < 110) {
				if (this.field847 == null) {
					this.field847 = new int[10];
					this.field858 = new int[10];
				}
				this.field847[var3 - 100] = arg1.g2();
				this.field858[var3 - 100] = arg1.g2();
			} else if (var3 == 110) {
				this.field848 = arg1.g2();
			} else if (var3 == 111) {
				this.field839 = arg1.g2();
			} else if (var3 == 112) {
				this.field850 = arg1.g2();
			} else if (var3 == 113) {
				this.ambient = arg1.g1b();
			} else if (var3 == 114) {
				this.contrast = arg1.g1b() * 5;
			} else if (var3 == 115) {
				this.field814 = arg1.g1();
			}
		}
	}

	@ObfuscatedName("GSCQQEUA.a(ZI)LLZYQDKJV;")
	public Model method228(int arg1) {
		int var3 = this.field816;
		int var4 = this.field843;
		if (arg1 == 1) {
			var3 = this.field857;
			var4 = this.field844;
		}
		if (var3 == -1) {
			return null;
		}
		Model var5 = Model.tryGet(var3);
		if (var4 != -1) {
			Model var6 = Model.tryGet(var4);
			Model[] var7 = new Model[] { var5, var6 };
			var5 = new Model(2, var7, (byte) -89);
		}
		if (this.field846 != null) {
			for (int var8 = 0; var8 < this.field846.length; var8++) {
				var5.method373(this.field846[var8], this.field823[var8]);
			}
		}
		return var5;
	}

	@ObfuscatedName("GSCQQEUA.c(I)LLZYQDKJV;")
	public Model method229(int arg0) {
		if (this.field847 != null && arg0 > 1) {
			int var2 = -1;
			for (int var3 = 0; var3 < 10; var3++) {
				if (arg0 >= this.field858[var3] && this.field858[var3] != 0) {
					var2 = this.field847[var3];
				}
			}
			if (var2 != -1) {
				return get(var2).method229(1);
			}
		}
		Model var4 = (Model) field819.get((long) this.field845);
		if (var4 != null) {
			return var4;
		}
		Model var5 = Model.tryGet(this.field842);
		if (var5 == null) {
			return null;
		}
		if (this.field848 != 128 || this.field839 != 128 || this.field850 != 128) {
			var5.method375(this.field839, this.field850, this.field848);
		}
		if (this.field846 != null) {
			for (int var6 = 0; var6 < this.field846.length; var6++) {
				var5.method373(this.field846[var6], this.field823[var6]);
			}
		}
		var5.calculateNormals(this.ambient + 64, this.contrast + 768, -50, -10, -50, true);
		var5.field1227 = true;
		field819.put(var5, (long) this.field845);
		return var5;
	}

	@ObfuscatedName("GSCQQEUA.a(BIII)LEPQDEJTO;")
	public static Pix32 method230(int arg1, int arg2, int arg3) {
		if (arg1 == 0) {
			Pix32 var4 = (Pix32) field828.get((long) arg3);
			if (var4 != null && var4.ohi != arg2 && var4.ohi != -1) {
				var4.unlink();
				var4 = null;
			}
			if (var4 != null) {
				return var4;
			}
		}
		ObjType var5 = get(arg3);
		if (var5.field847 == null) {
			arg2 = -1;
		}
		if (arg2 > 1) {
			int var6 = -1;
			for (int var7 = 0; var7 < 10; var7++) {
				if (arg2 >= var5.field858[var7] && var5.field858[var7] != 0) {
					var6 = var5.field847[var7];
				}
			}
			if (var6 != -1) {
				var5 = get(var6);
			}
		}
		Model var8 = var5.method229(1);
		if (var8 == null) {
			return null;
		}
		Pix32 var9 = null;
		if (var5.field825 != -1) {
			var9 = method230(-1, 10, var5.field815);
			if (var9 == null) {
				return null;
			}
		}
		Pix32 var10 = new Pix32(32, 32);
		int var11 = Pix3D.centerX;
		int var12 = Pix3D.centerY;
		int[] var13 = Pix3D.lineOffset;
		int[] var14 = Pix2D.data;
		int var15 = Pix2D.width2d;
		int var16 = Pix2D.height2d;
		int var17 = Pix2D.left;
		int var18 = Pix2D.right;
		int var19 = Pix2D.top;
		int var20 = Pix2D.bottom;
		Pix3D.jagged = false;
		Pix2D.bind(32, 32, var10.pixels);
		Pix2D.fillRect(32, 0, 0, 32, 0);
		Pix3D.method545();
		int var21 = var5.field851;
		if (arg1 == -1) {
			var21 = (int) ((double) var21 * 1.5D);
		}
		if (arg1 > 0) {
			var21 = (int) ((double) var21 * 1.04D);
		}
		int var22 = Pix3D.sinTable[var5.field841] * var21 >> 16;
		int var23 = Pix3D.cosTable[var5.field841] * var21 >> 16;
		var8.method380(0, var5.field838, var5.field821, var5.field841, var5.field809, var8.field1709 / 2 + var22 + var5.field822, var5.field822 + var23);
		for (int var24 = 31; var24 >= 0; var24--) {
			for (int var31 = 31; var31 >= 0; var31--) {
				if (var10.pixels[var31 * 32 + var24] == 0) {
					if (var24 > 0 && var10.pixels[var31 * 32 + (var24 - 1)] > 1) {
						var10.pixels[var31 * 32 + var24] = 1;
					} else if (var31 > 0 && var10.pixels[(var31 - 1) * 32 + var24] > 1) {
						var10.pixels[var31 * 32 + var24] = 1;
					} else if (var24 < 31 && var10.pixels[var31 * 32 + var24 + 1] > 1) {
						var10.pixels[var31 * 32 + var24] = 1;
					} else if (var31 < 31 && var10.pixels[(var31 + 1) * 32 + var24] > 1) {
						var10.pixels[var31 * 32 + var24] = 1;
					}
				}
			}
		}
		if (arg1 > 0) {
			for (int var25 = 31; var25 >= 0; var25--) {
				for (int var26 = 31; var26 >= 0; var26--) {
					if (var10.pixels[var26 * 32 + var25] == 0) {
						if (var25 > 0 && var10.pixels[var26 * 32 + (var25 - 1)] == 1) {
							var10.pixels[var26 * 32 + var25] = arg1;
						} else if (var26 > 0 && var10.pixels[(var26 - 1) * 32 + var25] == 1) {
							var10.pixels[var26 * 32 + var25] = arg1;
						} else if (var25 < 31 && var10.pixels[var26 * 32 + var25 + 1] == 1) {
							var10.pixels[var26 * 32 + var25] = arg1;
						} else if (var26 < 31 && var10.pixels[(var26 + 1) * 32 + var25] == 1) {
							var10.pixels[var26 * 32 + var25] = arg1;
						}
					}
				}
			}
		} else if (arg1 == 0) {
			for (int var27 = 31; var27 >= 0; var27--) {
				for (int var28 = 31; var28 >= 0; var28--) {
					if (var10.pixels[var28 * 32 + var27] == 0 && var27 > 0 && var28 > 0 && var10.pixels[(var28 - 1) * 32 + (var27 - 1)] > 0) {
						var10.pixels[var28 * 32 + var27] = 3153952;
					}
				}
			}
		}
		if (var5.field825 != -1) {
			int var29 = var9.owi;
			int var30 = var9.ohi;
			var9.owi = 32;
			var9.ohi = 32;
			var9.plotSprite(0, 0);
			var9.owi = var29;
			var9.ohi = var30;
		}
		if (arg1 == 0) {
			field828.put(var10, (long) arg3);
		}
		Pix2D.bind(var15, var16, var14);
		Pix2D.setClipping(var19, var17, var20, var18);
		Pix3D.centerX = var11;
		Pix3D.centerY = var12;
		Pix3D.lineOffset = var13;
		Pix3D.jagged = true;
		if (var5.field853) {
			var10.owi = 33;
		} else {
			var10.owi = 32;
		}
		var10.ohi = arg2;
		return var10;
	}

	@ObfuscatedName("GSCQQEUA.a(Z)V")
	public static void unload() {
		field819 = null;
		field828 = null;
		field824 = null;
		field818 = null;
		field855 = null;
	}

	@ObfuscatedName("GSCQQEUA.a()V")
	public void method232() {
		this.field842 = 0;
		this.field811 = null;
		this.field810 = null;
		this.field846 = null;
		this.field823 = null;
		this.field851 = 2000;
		this.field841 = 0;
		this.field838 = 0;
		this.field821 = 0;
		this.field809 = 0;
		this.field822 = 0;
		this.field854 = -1;
		this.field853 = false;
		this.field827 = 1;
		this.field859 = false;
		this.field820 = null;
		this.field830 = null;
		this.field835 = -1;
		this.field813 = -1;
		this.field860 = 0;
		this.field808 = -1;
		this.field837 = -1;
		this.field812 = 0;
		this.field852 = -1;
		this.field849 = -1;
		this.field816 = -1;
		this.field843 = -1;
		this.field857 = -1;
		this.field844 = -1;
		this.field847 = null;
		this.field858 = null;
		this.field815 = -1;
		this.field825 = -1;
		this.field848 = 128;
		this.field839 = 128;
		this.field850 = 128;
		this.ambient = 0;
		this.contrast = 0;
		this.field814 = 0;
	}
}
