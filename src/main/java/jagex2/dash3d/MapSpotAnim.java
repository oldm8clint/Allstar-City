package jagex2.dash3d;

import deob.ObfuscatedName;
import jagex2.config.SpotAnimType;

public class MapSpotAnim extends ModelSource {

	@ObfuscatedName("WHUAOHZM.q")
	public boolean field1526 = true;

	@ObfuscatedName("WHUAOHZM.r")
	public boolean field1527 = false;

	@ObfuscatedName("WHUAOHZM.u")
	public SpotAnimType field1530;

	@ObfuscatedName("WHUAOHZM.m")
	public int field1522;

	@ObfuscatedName("WHUAOHZM.n")
	public int field1523;

	@ObfuscatedName("WHUAOHZM.o")
	public int field1524;

	@ObfuscatedName("WHUAOHZM.p")
	public int field1525;

	@ObfuscatedName("WHUAOHZM.v")
	public int field1531;

	@ObfuscatedName("WHUAOHZM.s")
	public int field1528;

	@ObfuscatedName("WHUAOHZM.t")
	public int field1529;

	@ObfuscatedName("WHUAOHZM.a(BI)V")
	public void method486(byte arg0, int arg1) {
		this.field1529 += arg1;
		if (arg0 != 1) {
			return;
		}
		boolean var3 = false;
		while (true) {
			do {
				do {
					if (this.field1529 <= this.field1530.field1301.method214(this.field1528)) {
						return;
					}
					this.field1529 -= this.field1530.field1301.method214(this.field1528);
					this.field1528++;
				} while (this.field1528 < this.field1530.field1301.field776);
			} while (this.field1528 >= 0 && this.field1528 < this.field1530.field1301.field776);
			this.field1528 = 0;
			this.field1527 = true;
		}
	}

	public MapSpotAnim(int arg0, int arg1, int arg2, int arg3, int arg4, int arg5, int arg6, int arg7) {
		this.field1530 = SpotAnimType.field1297[arg4];
		this.field1522 = arg1;
		this.field1523 = arg0;
		this.field1524 = arg6;
		if (arg7 != 10709) {
			for (int var9 = 1; var9 > 0; var9++) {
			}
		}
		this.field1525 = arg2;
		this.field1531 = arg3 + arg5;
		this.field1527 = false;
	}

	@ObfuscatedName("WHUAOHZM.a(B)LLZYQDKJV;")
	public Model method239() {
		Model var2 = this.field1530.method439();
		if (var2 == null) {
			return null;
		}
		int var3 = this.field1530.field1301.field777[this.field1528];
		Model var4 = new Model(false, false, true, var2, AnimFrame.isNull(var3));
		if (!this.field1527) {
			var4.createLabelReferences();
			var4.applyTransform(var3);
			var4.field1226 = null;
			var4.field1225 = null;
		}
		if (this.field1530.field1304 != 128 || this.field1530.field1305 != 128) {
			var4.method375(this.field1530.field1305, this.field1530.field1304, this.field1530.field1304);
		}
		if (this.field1530.field1306 != 0) {
			if (this.field1530.field1306 == 90) {
				var4.method370(true);
			}
			if (this.field1530.field1306 == 180) {
				var4.method370(true);
				var4.method370(true);
			}
			if (this.field1530.field1306 == 270) {
				var4.method370(true);
				var4.method370(true);
				var4.method370(true);
			}
		}
		var4.calculateNormals(this.field1530.field1307 + 64, this.field1530.field1308 + 850, -30, -50, -30, true);
		return var4;
	}
}
