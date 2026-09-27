package jagex2.config;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;

public class VarbitType {

	@ObfuscatedName("ZQTIEXZH.h")
	public boolean field1765 = false;

	@ObfuscatedName("ZQTIEXZH.i")
	public int field1766 = -1;

	@ObfuscatedName("ZQTIEXZH.k")
	public boolean field1768 = true;

	@ObfuscatedName("ZQTIEXZH.b")
	public static int field1759;

	@ObfuscatedName("ZQTIEXZH.e")
	public int field1762;

	@ObfuscatedName("ZQTIEXZH.f")
	public int field1763;

	@ObfuscatedName("ZQTIEXZH.g")
	public int field1764;

	@ObfuscatedName("ZQTIEXZH.j")
	public int field1767;

	@ObfuscatedName("ZQTIEXZH.d")
	public String field1761;

	@ObfuscatedName("ZQTIEXZH.c")
	public static VarbitType[] field1760;

	@ObfuscatedName("ZQTIEXZH.a(LATJMVOZR;I)V")
	public static void unpack(Jagfile arg0) {
		Packet var2 = new Packet(arg0.read("varbit.dat", null));
		field1759 = var2.g2();
		if (field1760 == null) {
			field1760 = new VarbitType[field1759];
		}
		for (int var3 = 0; var3 < field1759; var3++) {
			if (field1760[var3] == null) {
				field1760[var3] = new VarbitType();
			}
			field1760[var3].method603(var3, var2);
			if (field1760[var3].field1765) {
				VarpType.field1507[field1760[var3].field1762].field1519 = true;
			}
		}
		if (var2.data.length != var2.pos) {
			System.out.println("varbit load mismatch");
		}
	}

	@ObfuscatedName("ZQTIEXZH.a(IILMFMVIYHT;)V")
	public void method603(int arg1, Packet arg2) {
		while (true) {
			int var4 = arg2.g1();
			if (var4 == 0) {
				return;
			}
			if (var4 == 1) {
				this.field1762 = arg2.g2();
				this.field1763 = arg2.g1();
				this.field1764 = arg2.g1();
			} else if (var4 == 10) {
				this.field1761 = arg2.gjstr();
			} else if (var4 == 2) {
				this.field1765 = true;
			} else if (var4 == 3) {
				this.field1766 = arg2.g4();
			} else if (var4 == 4) {
				this.field1767 = arg2.g4();
			} else if (var4 == 5) {
				this.field1768 = false;
			} else {
				System.out.println("Error unrecognised config code: " + var4);
			}
		}
	}
}
