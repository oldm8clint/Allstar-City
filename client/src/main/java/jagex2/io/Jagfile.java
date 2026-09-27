package jagex2.io;

import deob.ObfuscatedName;

public class Jagfile {

	@ObfuscatedName("ATJMVOZR.d")
	public int field52;

	@ObfuscatedName("ATJMVOZR.i")
	public boolean field57;

	@ObfuscatedName("ATJMVOZR.c")
	public byte[] field51;

	@ObfuscatedName("ATJMVOZR.e")
	public int[] field53;

	@ObfuscatedName("ATJMVOZR.f")
	public int[] field54;

	@ObfuscatedName("ATJMVOZR.g")
	public int[] field55;

	@ObfuscatedName("ATJMVOZR.h")
	public int[] field56;

	public Jagfile(byte[] arg0) {
		this.method1(arg0);
	}

	@ObfuscatedName("ATJMVOZR.a(I[B)V")
	public void method1(byte[] arg1) {
		Packet var3 = new Packet(arg1);
		int var4 = var3.g3();
		int var5 = var3.g3();
		if (var4 == var5) {
			this.field51 = arg1;
			this.field57 = false;
		} else {
			byte[] var6 = new byte[var4];
			BZip2.method445(var6, var4, arg1, var5, 6);
			this.field51 = var6;
			var3 = new Packet(this.field51);
			this.field57 = true;
		}
		this.field52 = var3.g2();
		this.field53 = new int[this.field52];
		this.field54 = new int[this.field52];
		this.field55 = new int[this.field52];
		this.field56 = new int[this.field52];
		int var7 = this.field52 * 10 + var3.pos;
		for (int var8 = 0; var8 < this.field52; var8++) {
			this.field53[var8] = var3.g4();
			this.field54[var8] = var3.g3();
			this.field55[var8] = var3.g3();
			this.field56[var8] = var7;
			var7 += this.field55[var8];
		}
	}

	@ObfuscatedName("ATJMVOZR.a(Ljava/lang/String;[B)[B")
	public byte[] read(String arg0, byte[] arg1) {
		int var3 = 0;
		String var4 = arg0.toUpperCase();
		for (int var5 = 0; var5 < var4.length(); var5++) {
			var3 = var3 * 61 + var4.charAt(var5) - 32;
		}
		for (int var6 = 0; var6 < this.field52; var6++) {
			if (this.field53[var6] == var3) {
				if (arg1 == null) {
					arg1 = new byte[this.field54[var6]];
				}
				if (this.field57) {
					for (int var7 = 0; var7 < this.field54[var6]; var7++) {
						arg1[var7] = this.field51[this.field56[var6] + var7];
					}
				} else {
					BZip2.method445(arg1, this.field54[var6], this.field51, this.field55[var6], this.field56[var6]);
				}
				return arg1;
			}
		}
		return null;
	}
}
