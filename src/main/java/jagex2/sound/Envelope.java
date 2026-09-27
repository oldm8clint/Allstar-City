package jagex2.sound;

import deob.ObfuscatedName;
import jagex2.io.Packet;

public class Envelope {

	@ObfuscatedName("PFANSVWX.a")
	public boolean field1345 = true;

	@ObfuscatedName("PFANSVWX.b")
	public int field1346;

	@ObfuscatedName("PFANSVWX.e")
	public int field1349;

	@ObfuscatedName("PFANSVWX.f")
	public int field1350;

	@ObfuscatedName("PFANSVWX.g")
	public int field1351;

	@ObfuscatedName("PFANSVWX.h")
	public int field1352;

	@ObfuscatedName("PFANSVWX.i")
	public int field1353;

	@ObfuscatedName("PFANSVWX.j")
	public int field1354;

	@ObfuscatedName("PFANSVWX.k")
	public int field1355;

	@ObfuscatedName("PFANSVWX.l")
	public int field1356;

	@ObfuscatedName("PFANSVWX.m")
	public static int field1357;

	@ObfuscatedName("PFANSVWX.c")
	public int[] field1347;

	@ObfuscatedName("PFANSVWX.d")
	public int[] field1348;

	@ObfuscatedName("PFANSVWX.a(BLMFMVIYHT;)V")
	public void method441(byte arg0, Packet arg1) {
		this.field1351 = arg1.g1();
		if (arg0 != 6) {
			throw new NullPointerException();
		}
		boolean var3 = false;
		this.field1349 = arg1.g4();
		this.field1350 = arg1.g4();
		this.method442(arg1, 0);
	}

	@ObfuscatedName("PFANSVWX.a(LMFMVIYHT;I)V")
	public void method442(Packet arg0, int arg1) {
		this.field1346 = arg0.g1();
		this.field1347 = new int[this.field1346];
		this.field1348 = new int[this.field1346];
		if (arg1 == 0) {
			for (int var3 = 0; var3 < this.field1346; var3++) {
				this.field1347[var3] = arg0.g2();
				this.field1348[var3] = arg0.g2();
			}
		}
	}

	@ObfuscatedName("PFANSVWX.a(Z)V")
	public void method443(boolean arg0) {
		this.field1352 = 0;
		this.field1353 = 0;
		if (arg0) {
			this.field1354 = 0;
			this.field1355 = 0;
			this.field1356 = 0;
		}
	}

	@ObfuscatedName("PFANSVWX.a(II)I")
	public int method444(int arg0, int arg1) {
		if (arg0 != 0) {
			for (int var3 = 1; var3 > 0; var3++) {
			}
		}
		if (this.field1356 >= this.field1352) {
			this.field1355 = this.field1348[this.field1353++] << 15;
			if (this.field1353 >= this.field1346) {
				this.field1353 = this.field1346 - 1;
			}
			this.field1352 = (int) ((double) this.field1347[this.field1353] / 65536.0D * (double) arg1);
			if (this.field1352 > this.field1356) {
				this.field1354 = ((this.field1348[this.field1353] << 15) - this.field1355) / (this.field1352 - this.field1356);
			}
		}
		this.field1355 += this.field1354;
		this.field1356++;
		return this.field1355 - this.field1354 >> 15;
	}
}
