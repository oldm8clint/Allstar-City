package jagex2.dash3d;

import deob.ObfuscatedName;
import jagex2.config.SpotAnimType;

public class ClientProj extends ModelSource {

	@ObfuscatedName("KFJRVZCI.I")
	public boolean field996 = false;

	@ObfuscatedName("KFJRVZCI.m")
	public SpotAnimType field974;

	@ObfuscatedName("KFJRVZCI.n")
	public int field975;

	@ObfuscatedName("KFJRVZCI.J")
	public int field997;

	@ObfuscatedName("KFJRVZCI.K")
	public int field998;

	@ObfuscatedName("KFJRVZCI.L")
	public int field999;

	@ObfuscatedName("KFJRVZCI.y")
	public int field986;

	@ObfuscatedName("KFJRVZCI.z")
	public int field987;

	@ObfuscatedName("KFJRVZCI.r")
	public int field979;

	@ObfuscatedName("KFJRVZCI.s")
	public int field980;

	@ObfuscatedName("KFJRVZCI.t")
	public int field981;

	@ObfuscatedName("KFJRVZCI.M")
	public int field1000;

	@ObfuscatedName("KFJRVZCI.o")
	public double field976;

	@ObfuscatedName("KFJRVZCI.p")
	public double field977;

	@ObfuscatedName("KFJRVZCI.q")
	public double field978;

	@ObfuscatedName("KFJRVZCI.C")
	public double field990;

	@ObfuscatedName("KFJRVZCI.D")
	public double field991;

	@ObfuscatedName("KFJRVZCI.E")
	public double field992;

	@ObfuscatedName("KFJRVZCI.F")
	public double field993;

	@ObfuscatedName("KFJRVZCI.H")
	public double field995;

	@ObfuscatedName("KFJRVZCI.v")
	public int field983;

	@ObfuscatedName("KFJRVZCI.w")
	public int field984;

	@ObfuscatedName("KFJRVZCI.A")
	public int field988;

	@ObfuscatedName("KFJRVZCI.B")
	public int field989;

	@ObfuscatedName("KFJRVZCI.a(IIIII)V")
	public void method271(int arg0, int arg1, int arg2, int arg3) {
		if (!this.field996) {
			double var6 = (double) (arg0 - this.field997);
			double var8 = (double) (arg1 - this.field998);
			double var10 = Math.sqrt(var6 * var6 + var8 * var8);
			this.field976 = (double) this.field980 * var6 / var10 + (double) this.field997;
			this.field977 = (double) this.field980 * var8 / var10 + (double) this.field998;
			this.field978 = this.field999;
		}
		double var12 = (double) (this.field987 + 1 - arg3);
		this.field990 = ((double) arg0 - this.field976) / var12;
		this.field991 = ((double) arg1 - this.field977) / var12;
		this.field992 = Math.sqrt(this.field991 * this.field991 + this.field990 * this.field990);
		if (!this.field996) {
			this.field993 = -this.field992 * Math.tan((double) this.field979 * 0.02454369D);
		}
		this.field995 = ((double) arg2 - this.field978 - this.field993 * var12) * 2.0D / (var12 * var12);
	}

	@ObfuscatedName("KFJRVZCI.a(IZ)V")
	public void method272(int arg0) {
		this.field996 = true;
		this.field976 += (double) arg0 * this.field990;
		this.field977 += (double) arg0 * this.field991;
		this.field978 += this.field995 * 0.5D * (double) arg0 * (double) arg0 + (double) arg0 * this.field993;
		this.field993 += (double) arg0 * this.field995;
		this.field983 = (int) (Math.atan2(this.field990, this.field991) * 325.949D) + 1024 & 0x7FF;
		this.field984 = (int) (Math.atan2(this.field993, this.field992) * 325.949D) & 0x7FF;
		if (this.field974.field1301 == null) {
			return;
		}
		this.field989 += arg0;
		while (this.field989 > this.field974.field1301.method214(this.field988)) {
			this.field989 -= this.field974.field1301.method214(this.field988);
			this.field988++;
			if (this.field988 >= this.field974.field1301.field776) {
				this.field988 = 0;
			}
		}
	}

	@ObfuscatedName("KFJRVZCI.a(B)LLZYQDKJV;")
	public Model method239() {
		Model var2 = this.field974.method439();
		if (var2 == null) {
			return null;
		}
		int var3 = -1;
		if (this.field974.field1301 != null) {
			var3 = this.field974.field1301.field777[this.field988];
		}
		Model var4 = new Model(false, false, true, var2, AnimFrame.isNull(var3));
		if (var3 != -1) {
			var4.createLabelReferences();
			var4.applyTransform(var3);
			var4.field1226 = null;
			var4.field1225 = null;
		}
		if (this.field974.field1304 != 128 || this.field974.field1305 != 128) {
			var4.method375(this.field974.field1305, this.field974.field1304, this.field974.field1304);
		}
		var4.method371(this.field984);
		var4.calculateNormals(this.field974.field1307 + 64, this.field974.field1308 + 850, -30, -50, -30, true);
		return var4;
	}

	public ClientProj(int arg0, int arg1, int arg2, int arg3, int arg4, int arg5, int arg6, int arg7, int arg9, int arg10, int arg11) {
		this.field974 = SpotAnimType.field1297[arg4];
		this.field975 = arg0;
		this.field997 = arg10;
		this.field998 = arg3;
		this.field999 = arg9;
		this.field986 = arg11;
		this.field987 = arg5;
		this.field979 = arg6;
		this.field980 = arg2;
		this.field981 = arg7;
		this.field1000 = arg1;
		this.field996 = false;
	}
}
