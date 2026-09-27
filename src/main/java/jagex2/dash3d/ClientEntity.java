package jagex2.dash3d;

import deob.ObfuscatedName;
import jagex2.config.SeqType;

public abstract class ClientEntity extends ModelSource {

	@ObfuscatedName("LRUWCBNN.o")
	public int chatTimer = 100;

	@ObfuscatedName("LRUWCBNN.s")
	public int[] routeTileX = new int[10];

	@ObfuscatedName("LRUWCBNN.t")
	public int[] routeTileZ = new int[10];

	@ObfuscatedName("LRUWCBNN.u")
	public int field1135 = -1;

	@ObfuscatedName("LRUWCBNN.x")
	public boolean[] field1138 = new boolean[10];

	@ObfuscatedName("LRUWCBNN.y")
	public boolean field1139 = false;

	@ObfuscatedName("LRUWCBNN.A")
	public int field1141 = 200;

	@ObfuscatedName("LRUWCBNN.B")
	public int field1142 = -1000;

	@ObfuscatedName("LRUWCBNN.G")
	public int field1147 = 32;

	@ObfuscatedName("LRUWCBNN.H")
	public int field1148 = 1;

	@ObfuscatedName("LRUWCBNN.P")
	public int field1156 = -1;

	@ObfuscatedName("LRUWCBNN.U")
	public int field1161 = -1;

	@ObfuscatedName("LRUWCBNN.Z")
	public int field1166 = -1;

	@ObfuscatedName("LRUWCBNN.ab")
	public int field1167 = -1;

	@ObfuscatedName("LRUWCBNN.bb")
	public int field1168 = -1;

	@ObfuscatedName("LRUWCBNN.cb")
	public int field1169 = -1;

	@ObfuscatedName("LRUWCBNN.eb")
	public int field1171 = -1;

	@ObfuscatedName("LRUWCBNN.jb")
	public int field1176 = -1;

	@ObfuscatedName("LRUWCBNN.kb")
	public int[] field1177 = new int[4];

	@ObfuscatedName("LRUWCBNN.lb")
	public int[] field1178 = new int[4];

	@ObfuscatedName("LRUWCBNN.mb")
	public int[] field1179 = new int[4];

	@ObfuscatedName("LRUWCBNN.ob")
	public int field1181 = -1;

	@ObfuscatedName("LRUWCBNN.pb")
	public int field1182 = -1;

	@ObfuscatedName("LRUWCBNN.p")
	public int chatColour;

	@ObfuscatedName("LRUWCBNN.q")
	public int field1131;

	@ObfuscatedName("LRUWCBNN.r")
	public int cycle;

	@ObfuscatedName("LRUWCBNN.v")
	public int field1136;

	@ObfuscatedName("LRUWCBNN.w")
	public int field1137;

	@ObfuscatedName("LRUWCBNN.z")
	public int chatEffect;

	@ObfuscatedName("LRUWCBNN.C")
	public int field1143;

	@ObfuscatedName("LRUWCBNN.D")
	public int field1144;

	@ObfuscatedName("LRUWCBNN.E")
	public int field1145;

	@ObfuscatedName("LRUWCBNN.F")
	public int field1146;

	@ObfuscatedName("LRUWCBNN.I")
	public int field1149;

	@ObfuscatedName("LRUWCBNN.J")
	public int field1150;

	@ObfuscatedName("LRUWCBNN.K")
	public int field1151;

	@ObfuscatedName("LRUWCBNN.L")
	public int field1152;

	@ObfuscatedName("LRUWCBNN.M")
	public int field1153;

	@ObfuscatedName("LRUWCBNN.N")
	public int field1154;

	@ObfuscatedName("LRUWCBNN.O")
	public int field1155;

	@ObfuscatedName("LRUWCBNN.Q")
	public int field1157;

	@ObfuscatedName("LRUWCBNN.R")
	public int field1158;

	@ObfuscatedName("LRUWCBNN.S")
	public int field1159;

	@ObfuscatedName("LRUWCBNN.T")
	public int field1160;

	@ObfuscatedName("LRUWCBNN.V")
	public int field1162;

	@ObfuscatedName("LRUWCBNN.W")
	public int field1163;

	@ObfuscatedName("LRUWCBNN.X")
	public int field1164;

	@ObfuscatedName("LRUWCBNN.Y")
	public int field1165;

	@ObfuscatedName("LRUWCBNN.db")
	public int field1170;

	@ObfuscatedName("LRUWCBNN.fb")
	public int field1172;

	@ObfuscatedName("LRUWCBNN.gb")
	public int field1173;

	@ObfuscatedName("LRUWCBNN.hb")
	public int field1174;

	@ObfuscatedName("LRUWCBNN.ib")
	public int field1175;

	@ObfuscatedName("LRUWCBNN.nb")
	public int field1180;

	@ObfuscatedName("LRUWCBNN.m")
	public String chatMessage;

	@ObfuscatedName("LRUWCBNN.a(I)V")
	public void clearRoute() {
		this.field1180 = 0;
		this.field1160 = 0;
	}

	@ObfuscatedName("LRUWCBNN.b(I)Z")
	public boolean method351() {
		return false;
	}

	@ObfuscatedName("LRUWCBNN.a(ZII)V")
	public void step(boolean arg0, int arg1) {
		int var4 = this.routeTileX[0];
		int var5 = this.routeTileZ[0];
		if (arg1 == 0) {
			var4--;
			var5++;
		}
		if (arg1 == 1) {
			var5++;
		}
		if (arg1 == 2) {
			var4++;
			var5++;
		}
		if (arg1 == 3) {
			var4--;
		}
		if (arg1 == 4) {
			var4++;
		}
		if (arg1 == 5) {
			var4--;
			var5--;
		}
		if (arg1 == 6) {
			var5--;
		}
		if (arg1 == 7) {
			var4++;
			var5--;
		}
		if (this.field1171 != -1 && SeqType.field775[this.field1171].field788 == 1) {
			this.field1171 = -1;
		}
		if (this.field1180 < 9) {
			this.field1180++;
		}
		for (int var6 = this.field1180; var6 > 0; var6--) {
			this.routeTileX[var6] = this.routeTileX[var6 - 1];
			this.routeTileZ[var6] = this.routeTileZ[var6 - 1];
			this.field1138[var6] = this.field1138[var6 - 1];
		}
		this.routeTileX[0] = var4;
		this.routeTileZ[0] = var5;
		this.field1138[0] = arg0;
	}

	@ObfuscatedName("LRUWCBNN.a(IZII)V")
	public void method353(int arg0, int arg2, int arg3) {
		for (int var5 = 0; var5 < 4; var5++) {
			if (this.field1179[var5] <= arg0) {
				this.field1177[var5] = arg2;
				this.field1178[var5] = arg3;
				this.field1179[var5] = arg0 + 70;
				return;
			}
		}
	}

	@ObfuscatedName("LRUWCBNN.a(IBZI)V")
	public void move(int arg0, boolean arg2, int arg3) {
		if (this.field1171 != -1 && SeqType.field775[this.field1171].field788 == 1) {
			this.field1171 = -1;
		}
		if (!arg2) {
			int var5 = arg3 - this.routeTileX[0];
			int var6 = arg0 - this.routeTileZ[0];
			if (var5 >= -8 && var5 <= 8 && var6 >= -8 && var6 <= 8) {
				if (this.field1180 < 9) {
					this.field1180++;
				}
				for (int var7 = this.field1180; var7 > 0; var7--) {
					this.routeTileX[var7] = this.routeTileX[var7 - 1];
					this.routeTileZ[var7] = this.routeTileZ[var7 - 1];
					this.field1138[var7] = this.field1138[var7 - 1];
				}
				this.routeTileX[0] = arg3;
				this.routeTileZ[0] = arg0;
				this.field1138[0] = false;
				return;
			}
		}
		this.field1180 = 0;
		this.field1160 = 0;
		this.field1170 = 0;
		this.routeTileX[0] = arg3;
		this.routeTileZ[0] = arg0;
		this.field1157 = this.routeTileX[0] * 128 + this.field1148 * 64;
		this.field1158 = this.routeTileZ[0] * 128 + this.field1148 * 64;
	}
}
