package jagex2.config;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;

public class VarpType {

	@ObfuscatedName("WEUDDWZB.h")
	public boolean field1513 = false;

	@ObfuscatedName("WEUDDWZB.i")
	public boolean field1514 = true;

	@ObfuscatedName("WEUDDWZB.k")
	public boolean field1516 = false;

	@ObfuscatedName("WEUDDWZB.n")
	public boolean field1519 = false;

	@ObfuscatedName("WEUDDWZB.o")
	public int field1520 = -1;

	@ObfuscatedName("WEUDDWZB.p")
	public boolean field1521 = true;

	@ObfuscatedName("WEUDDWZB.a")
	public static int field1506;

	@ObfuscatedName("WEUDDWZB.c")
	public static int field1508;

	@ObfuscatedName("WEUDDWZB.f")
	public int field1511;

	@ObfuscatedName("WEUDDWZB.g")
	public int field1512;

	@ObfuscatedName("WEUDDWZB.j")
	public int field1515;

	@ObfuscatedName("WEUDDWZB.l")
	public int field1517;

	@ObfuscatedName("WEUDDWZB.m")
	public int field1518;

	@ObfuscatedName("WEUDDWZB.e")
	public String field1510;

	@ObfuscatedName("WEUDDWZB.d")
	public static int[] field1509;

	@ObfuscatedName("WEUDDWZB.b")
	public static VarpType[] field1507;

	@ObfuscatedName("WEUDDWZB.a(LATJMVOZR;I)V")
	public static void unpack(Jagfile arg0) {
		Packet var2 = new Packet(arg0.read("varp.dat", null));
		field1508 = 0;
		field1506 = var2.g2();
		if (field1507 == null) {
			field1507 = new VarpType[field1506];
		}
		if (field1509 == null) {
			field1509 = new int[field1506];
		}
		for (int var3 = 0; var3 < field1506; var3++) {
			if (field1507[var3] == null) {
				field1507[var3] = new VarpType();
			}
			field1507[var3].method485(var3, var2);
		}
		if (var2.data.length != var2.pos) {
			System.out.println("varptype load mismatch");
		}
	}

	@ObfuscatedName("WEUDDWZB.a(IILMFMVIYHT;)V")
	public void method485(int arg1, Packet arg2) {
		while (true) {
			int var4 = arg2.g1();
			if (var4 == 0) {
				return;
			}
			if (var4 == 1) {
				this.field1511 = arg2.g1();
			} else if (var4 == 2) {
				this.field1512 = arg2.g1();
			} else if (var4 == 3) {
				this.field1513 = true;
				field1509[field1508++] = arg1;
			} else if (var4 == 4) {
				this.field1514 = false;
			} else if (var4 == 5) {
				this.field1515 = arg2.g2();
			} else if (var4 == 6) {
				this.field1516 = true;
			} else if (var4 == 7) {
				this.field1517 = arg2.g4();
			} else if (var4 == 8) {
				this.field1518 = 1;
				this.field1519 = true;
			} else if (var4 == 10) {
				this.field1510 = arg2.gjstr();
			} else if (var4 == 11) {
				this.field1519 = true;
			} else if (var4 == 12) {
				this.field1520 = arg2.g4();
			} else if (var4 == 13) {
				this.field1518 = 2;
				this.field1519 = true;
			} else if (var4 == 14) {
				this.field1521 = false;
			} else {
				System.out.println("Error unrecognised config code: " + var4);
			}
		}
	}
}
