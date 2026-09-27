package jagex2.dash3d;

import deob.ObfuscatedName;
import jagex2.config.NpcType;
import jagex2.config.SeqType;
import jagex2.config.SpotAnimType;

public class ClientNpc extends ClientEntity {

	@ObfuscatedName("RGHBDSIJ.qb")
	public boolean field1369 = true;

	@ObfuscatedName("RGHBDSIJ.rb")
	public NpcType field1370;

	@ObfuscatedName("RGHBDSIJ.b(B)LLZYQDKJV;")
	public Model method457(byte arg0) {
		if (super.field1171 >= 0 && super.field1174 == 0) {
			int var2 = SeqType.field775[super.field1171].field777[super.field1172];
			int var3 = -1;
			if (super.field1135 >= 0 && super.field1181 != super.field1135) {
				var3 = SeqType.field775[super.field1135].field777[super.field1136];
			}
			return this.field1370.method475(var2, var3, SeqType.field775[super.field1171].field781);
		}
		int var4 = -1;
		if (arg0 != 122) {
			this.field1369 = !this.field1369;
		}
		if (super.field1135 >= 0) {
			var4 = SeqType.field775[super.field1135].field777[super.field1136];
		}
		return this.field1370.method475(var4, -1, null);
	}

	@ObfuscatedName("RGHBDSIJ.a(B)LLZYQDKJV;")
	public Model method239() {
		boolean var2 = false;
		if (this.field1370 == null) {
			return null;
		}
		Model var3 = this.method457((byte) 122);
		if (var3 == null) {
			return null;
		}
		super.field1141 = var3.field1709;
		if (super.field1161 != -1 && super.field1162 != -1) {
			SpotAnimType var4 = SpotAnimType.field1297[super.field1161];
			Model var5 = var4.method439();
			if (var5 != null) {
				int var6 = var4.field1301.field777[super.field1162];
				Model var7 = new Model(false, false, true, var5, AnimFrame.isNull(var6));
				var7.method372(0, 0, -super.field1165);
				var7.createLabelReferences();
				var7.applyTransform(var6);
				var7.field1226 = null;
				var7.field1225 = null;
				if (var4.field1304 != 128 || var4.field1305 != 128) {
					var7.method375(var4.field1305, var4.field1304, var4.field1304);
				}
				var7.calculateNormals(var4.field1307 + 64, var4.field1308 + 850, -30, -50, -30, true);
				Model[] var8 = new Model[] { var3, var7 };
				var3 = new Model(2, true, 0, var8);
			}
		}
		if (this.field1370.field1445 == 1) {
			var3.field1227 = true;
		}
		return var3;
	}

	@ObfuscatedName("RGHBDSIJ.b(I)Z")
	public boolean method351() {
		return this.field1370 != null;
	}
}
