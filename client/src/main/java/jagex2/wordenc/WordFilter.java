package jagex2.wordenc;

import deob.ObfuscatedName;
import jagex2.io.Jagfile;
import jagex2.io.Packet;

public class WordFilter {

	@ObfuscatedName("WXKKTWFB.s")
	public static final String[] field1574 = new String[] { "cook", "cook's", "cooks", "seeks", "sheet", "woop", "woops", "faq", "noob", "noobs" };

	@ObfuscatedName("WXKKTWFB.m")
	public static int[] field1568;

	@ObfuscatedName("WXKKTWFB.r")
	public static int[] field1573;

	@ObfuscatedName("WXKKTWFB.n")
	public static char[][] field1569;

	@ObfuscatedName("WXKKTWFB.p")
	public static char[][] field1571;

	@ObfuscatedName("WXKKTWFB.q")
	public static char[][] field1572;

	@ObfuscatedName("WXKKTWFB.o")
	public static byte[][][] field1570;

	@ObfuscatedName("WXKKTWFB.a(LATJMVOZR;)V")
	public static void unpack(Jagfile arg0) {
		Packet var1 = new Packet(arg0.read("fragmentsenc.txt", null));
		Packet var2 = new Packet(arg0.read("badenc.txt", null));
		Packet var3 = new Packet(arg0.read("domainenc.txt", null));
		Packet var4 = new Packet(arg0.read("tldlist.txt", null));
		method495(var1, var2, var3, var4);
	}

	@ObfuscatedName("WXKKTWFB.a(LMFMVIYHT;LMFMVIYHT;LMFMVIYHT;LMFMVIYHT;)V")
	public static void method495(Packet arg0, Packet arg1, Packet arg2, Packet arg3) {
		method497(arg1);
		method498(arg2);
		method499(arg0);
		method496(arg3);
	}

	@ObfuscatedName("WXKKTWFB.a(LMFMVIYHT;I)V")
	public static void method496(Packet arg0) {
		int var2 = arg0.g4();
		field1572 = new char[var2][];
		field1573 = new int[var2];
		for (int var3 = 0; var3 < var2; var3++) {
			field1573[var3] = arg0.g1();
			char[] var4 = new char[arg0.g1()];
			for (int var5 = 0; var5 < var4.length; var5++) {
				var4[var5] = (char) arg0.g1();
			}
			field1572[var3] = var4;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(ZLMFMVIYHT;)V")
	public static void method497(Packet arg1) {
		int var2 = arg1.g4();
		field1569 = new char[var2][];
		field1570 = new byte[var2][][];
		method500(arg1, field1569, field1570);
	}

	@ObfuscatedName("WXKKTWFB.a(ILMFMVIYHT;)V")
	public static void method498(Packet arg1) {
		int var2 = arg1.g4();
		field1571 = new char[var2][];
		method501(arg1, field1571);
	}

	@ObfuscatedName("WXKKTWFB.b(LMFMVIYHT;I)V")
	public static void method499(Packet arg0) {
		field1568 = new int[arg0.g4()];
		for (int var2 = 0; var2 < field1568.length; var2++) {
			field1568[var2] = arg0.g2();
		}
	}

	@ObfuscatedName("WXKKTWFB.a(ILMFMVIYHT;[[C[[[B)V")
	public static void method500(Packet arg1, char[][] arg2, byte[][][] arg3) {
		for (int var4 = 0; var4 < arg2.length; var4++) {
			char[] var5 = new char[arg1.g1()];
			for (int var6 = 0; var6 < var5.length; var6++) {
				var5[var6] = (char) arg1.g1();
			}
			arg2[var4] = var5;
			byte[][] var7 = new byte[arg1.g1()][2];
			for (int var8 = 0; var8 < var7.length; var8++) {
				var7[var8][0] = (byte) arg1.g1();
				var7[var8][1] = (byte) arg1.g1();
			}
			if (var7.length > 0) {
				arg3[var4] = var7;
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a(LMFMVIYHT;[[CI)V")
	public static void method501(Packet arg0, char[][] arg1) {
		for (int var3 = 0; var3 < arg1.length; var3++) {
			char[] var4 = new char[arg0.g1()];
			for (int var5 = 0; var5 < var4.length; var5++) {
				var4[var5] = (char) arg0.g1();
			}
			arg1[var3] = var4;
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CB)V")
	public static void method502(char[] arg0) {
		int var2 = 0;
		for (int var3 = 0; var3 < arg0.length; var3++) {
			if (method503(arg0[var3])) {
				arg0[var2] = arg0[var3];
			} else {
				arg0[var2] = ' ';
			}
			if (var2 == 0 || arg0[var2] != ' ' || arg0[var2 - 1] != ' ') {
				var2++;
			}
		}
		for (int var4 = var2; var4 < arg0.length; var4++) {
			arg0[var4] = ' ';
		}
	}

	@ObfuscatedName("WXKKTWFB.a(CI)Z")
	public static boolean method503(char arg0) {
		return arg0 >= ' ' && arg0 <= 127 || arg0 == ' ' || arg0 == '\n' || arg0 == '\t' || arg0 == 163 || arg0 == 8364;
	}

	@ObfuscatedName("WXKKTWFB.a(BLjava/lang/String;)Ljava/lang/String;")
	public static String filter(String arg1) {
		long var2 = System.currentTimeMillis();
		char[] var4 = arg1.toCharArray();
		method502(var4);
		String var5 = (new String(var4)).trim();
		char[] var6 = var5.toLowerCase().toCharArray();
		String var7 = var5.toLowerCase();
		method512(var6);
		method507(var6);
		method508(var6);
		method521(3, var6);
		for (int var8 = 0; var8 < field1574.length; var8++) {
			int var11 = -1;
			while ((var11 = var7.indexOf(field1574[var8], var11 + 1)) != -1) {
				char[] var12 = field1574[var8].toCharArray();
				for (int var13 = 0; var13 < var12.length; var13++) {
					var6[var11 + var13] = var12[var13];
				}
			}
		}
		method505(var6, var5.toCharArray());
		method506(var6);
		long var9 = System.currentTimeMillis();
		return (new String(var6)).trim();
	}

	@ObfuscatedName("WXKKTWFB.a(I[C[C)V")
	public static void method505(char[] arg1, char[] arg2) {
		for (int var3 = 0; var3 < arg2.length; var3++) {
			if (arg1[var3] != '*' && method529(arg2[var3])) {
				arg1[var3] = arg2[var3];
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a(I[C)V")
	public static void method506(char[] arg1) {
		boolean var2 = true;
		for (int var3 = 0; var3 < arg1.length; var3++) {
			char var4 = arg1[var3];
			if (!method526(var4)) {
				var2 = true;
			} else if (var2) {
				if (method528(var4)) {
					var2 = false;
				}
			} else if (method529(var4)) {
				arg1[var3] = (char) (var4 + 'a' - 65);
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CI)V")
	public static void method507(char[] arg0) {
		for (int var2 = 0; var2 < 2; var2++) {
			for (int var3 = field1569.length - 1; var3 >= 0; var3--) {
				method516(field1570[var3], field1569[var3], arg0);
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.b(I[C)V")
	public static void method508(char[] arg1) {
		char[] var2 = (char[]) arg1.clone();
		char[] var3 = new char[] { '(', 'a', ')' };
		method516(null, var3, var2);
		char[] var4 = (char[]) arg1.clone();
		char[] var5 = new char[] { 'd', 'o', 't' };
		method516(null, var5, var4);
		for (int var6 = field1571.length - 1; var6 >= 0; var6--) {
			method509(arg1, var4, var2, field1571[var6]);
		}
	}

	@ObfuscatedName("WXKKTWFB.a([C[C[CI[C)V")
	public static void method509(char[] arg0, char[] arg1, char[] arg2, char[] arg4) {
		if (arg4.length > arg0.length) {
			return;
		}
		boolean var5 = true;
		int var9;
		for (int var6 = 0; var6 <= arg0.length - arg4.length; var6 += var9) {
			int var7 = var6;
			int var8 = 0;
			var9 = 1;
			label61: while (true) {
				while (true) {
					if (var7 >= arg0.length) {
						break label61;
					}
					boolean var10 = false;
					char var11 = arg0[var7];
					char var12 = 0;
					if (var7 + 1 < arg0.length) {
						var12 = arg0[var7 + 1];
					}
					int var13;
					if (var8 < arg4.length && (var13 = method518(var11, arg4[var8], var12)) > 0) {
						var7 += var13;
						var8++;
					} else {
						if (var8 == 0) {
							break label61;
						}
						int var14;
						if ((var14 = method518(var11, arg4[var8 - 1], var12)) > 0) {
							var7 += var14;
							if (var8 == 1) {
								var9++;
							}
						} else {
							if (var8 >= arg4.length || !method524(var11)) {
								break label61;
							}
							var7++;
						}
					}
				}
			}
			if (var8 >= arg4.length) {
				boolean var15 = false;
				int var16 = method510(arg0, arg2, var6);
				int var17 = method511(arg1, var7 - 1, arg0);
				if (var16 > 2 || var17 > 2) {
					var15 = true;
				}
				if (var15) {
					for (int var18 = var6; var18 < var7; var18++) {
						arg0[var18] = '*';
					}
				}
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a([C[CBI)I")
	public static int method510(char[] arg0, char[] arg1, int arg3) {
		if (arg3 == 0) {
			return 2;
		}
		for (int var4 = arg3 - 1; var4 >= 0 && method524(arg0[var4]); var4--) {
			if (arg0[var4] == '@') {
				return 3;
			}
		}
		int var5 = 0;
		for (int var6 = arg3 - 1; var6 >= 0 && method524(arg1[var6]); var6--) {
			if (arg1[var6] == '*') {
				var5++;
			}
		}
		if (var5 >= 3) {
			return 4;
		} else if (method524(arg0[arg3 - 1])) {
			return 1;
		} else {
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CII[C)I")
	public static int method511(char[] arg0, int arg2, char[] arg3) {
		if (arg2 + 1 == arg3.length) {
			return 2;
		}
		int var4 = arg2 + 1;
		while (true) {
			if (var4 < arg3.length && method524(arg3[var4])) {
				if (arg3[var4] != '.' && arg3[var4] != ',') {
					var4++;
					continue;
				}
				return 3;
			}
			int var5 = 0;
			for (int var6 = arg2 + 1; var6 < arg3.length && method524(arg0[var6]); var6++) {
				if (arg0[var6] == '*') {
					var5++;
				}
			}
			if (var5 >= 3) {
				return 4;
			}
			if (method524(arg3[arg2 + 1])) {
				return 1;
			}
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.b([CI)V")
	public static void method512(char[] arg0) {
		char[] var2 = (char[]) arg0.clone();
		char[] var3 = new char[] { 'd', 'o', 't' };
		method516(null, var3, var2);
		char[] var4 = (char[]) arg0.clone();
		char[] var5 = new char[] { 's', 'l', 'a', 's', 'h' };
		method516(null, var5, var4);
		for (int var6 = 0; var6 < field1572.length; var6++) {
			method513(arg0, var2, field1573[var6], field1572[var6], var4);
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CB[CI[C[C)V")
	public static void method513(char[] arg0, char[] arg2, int arg3, char[] arg4, char[] arg5) {
		if (arg4.length > arg0.length) {
			return;
		}
		boolean var6 = true;
		int var11;
		for (int var7 = 0; var7 <= arg0.length - arg4.length; var7 += var11) {
			int var9 = var7;
			int var10 = 0;
			var11 = 1;
			label128: while (true) {
				while (true) {
					if (var9 >= arg0.length) {
						break label128;
					}
					boolean var12 = false;
					char var13 = arg0[var9];
					char var14 = 0;
					if (var9 + 1 < arg0.length) {
						var14 = arg0[var9 + 1];
					}
					int var15;
					if (var10 < arg4.length && (var15 = method518(var13, arg4[var10], var14)) > 0) {
						var9 += var15;
						var10++;
					} else {
						if (var10 == 0) {
							break label128;
						}
						int var16;
						if ((var16 = method518(var13, arg4[var10 - 1], var14)) > 0) {
							var9 += var16;
							if (var10 == 1) {
								var11++;
							}
						} else {
							if (var10 >= arg4.length || !method524(var13)) {
								break label128;
							}
							var9++;
						}
					}
				}
			}
			if (var10 >= arg4.length) {
				boolean var17 = false;
				int var18 = method514(arg2, var7, arg0);
				int var19 = method515(arg5, var9 - 1, arg0);
				if (arg3 == 1 && var18 > 0 && var19 > 0) {
					var17 = true;
				}
				if (arg3 == 2 && (var18 > 2 && var19 > 0 || var18 > 0 && var19 > 2)) {
					var17 = true;
				}
				if (arg3 == 3 && var18 > 0 && var19 > 2) {
					var17 = true;
				}
				boolean var10000;
				if (arg3 == 3 && var18 > 2 && var19 > 0) {
					var10000 = true;
				} else {
					var10000 = false;
				}
				if (var17) {
					int var20 = var7;
					int var21 = var9 - 1;
					if (var18 > 2) {
						if (var18 == 4) {
							boolean var22 = false;
							for (int var23 = var7 - 1; var23 >= 0; var23--) {
								if (var22) {
									if (arg2[var23] != '*') {
										break;
									}
									var20 = var23;
								} else if (arg2[var23] == '*') {
									var20 = var23;
									var22 = true;
								}
							}
						}
						boolean var24 = false;
						for (int var25 = var20 - 1; var25 >= 0; var25--) {
							if (var24) {
								if (method524(arg0[var25])) {
									break;
								}
								var20 = var25;
							} else if (!method524(arg0[var25])) {
								var24 = true;
								var20 = var25;
							}
						}
					}
					if (var19 > 2) {
						if (var19 == 4) {
							boolean var26 = false;
							for (int var27 = var21 + 1; var27 < arg0.length; var27++) {
								if (var26) {
									if (arg5[var27] != '*') {
										break;
									}
									var21 = var27;
								} else if (arg5[var27] == '*') {
									var21 = var27;
									var26 = true;
								}
							}
						}
						boolean var28 = false;
						for (int var29 = var21 + 1; var29 < arg0.length; var29++) {
							if (var28) {
								if (method524(arg0[var29])) {
									break;
								}
								var21 = var29;
							} else if (!method524(arg0[var29])) {
								var28 = true;
								var21 = var29;
							}
						}
					}
					for (int var30 = var20; var30 <= var21; var30++) {
						arg0[var30] = '*';
					}
				}
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CI[CB)I")
	public static int method514(char[] arg0, int arg1, char[] arg2) {
		if (arg1 == 0) {
			return 2;
		}
		int var5 = arg1 - 1;
		while (true) {
			if (var5 >= 0 && method524(arg2[var5])) {
				if (arg2[var5] != ',' && arg2[var5] != '.') {
					var5--;
					continue;
				}
				return 3;
			}
			int var6 = 0;
			for (int var7 = arg1 - 1; var7 >= 0 && method524(arg0[var7]); var7--) {
				if (arg0[var7] == '*') {
					var6++;
				}
			}
			if (var6 >= 3) {
				return 4;
			}
			if (method524(arg2[arg1 - 1])) {
				return 1;
			}
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a([CI[CI)I")
	public static int method515(char[] arg0, int arg1, char[] arg2) {
		if (arg1 + 1 == arg2.length) {
			return 2;
		}
		int var5 = arg1 + 1;
		while (true) {
			if (var5 < arg2.length && method524(arg2[var5])) {
				if (arg2[var5] != '\\' && arg2[var5] != '/') {
					var5++;
					continue;
				}
				return 3;
			}
			int var6 = 0;
			for (int var7 = arg1 + 1; var7 < arg2.length && method524(arg0[var7]); var7++) {
				if (arg0[var7] == '*') {
					var6++;
				}
			}
			if (var6 >= 5) {
				return 4;
			}
			if (method524(arg2[arg1 + 1])) {
				return 1;
			}
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a([[BI[C[C)V")
	public static void method516(byte[][] arg0, char[] arg2, char[] arg3) {
		if (arg2.length > arg3.length) {
			return;
		}
		boolean var4 = true;
		int var9;
		for (int var5 = 0; var5 <= arg3.length - arg2.length; var5 += var9) {
			int var6 = var5;
			int var7 = 0;
			int var8 = 0;
			var9 = 1;
			boolean var10 = false;
			boolean var11 = false;
			boolean var12 = false;
			label167: while (true) {
				while (true) {
					if (var6 >= arg3.length || var11 && var12) {
						break label167;
					}
					boolean var13 = false;
					char var14 = arg3[var6];
					char var15 = 0;
					if (var6 + 1 < arg3.length) {
						var15 = arg3[var6 + 1];
					}
					int var16;
					if (var7 < arg2.length && (var16 = method519(arg2[var7], var14, var15)) > 0) {
						if (var16 == 1 && method527(var14)) {
							var11 = true;
						}
						if (var16 == 2 && (method527(var14) || method527(var15))) {
							var11 = true;
						}
						var6 += var16;
						var7++;
					} else {
						if (var7 == 0) {
							break label167;
						}
						int var17;
						if ((var17 = method519(arg2[var7 - 1], var14, var15)) > 0) {
							var6 += var17;
							if (var7 == 1) {
								var9++;
							}
						} else {
							if (var7 >= arg2.length || !method525(var14)) {
								break label167;
							}
							if (method524(var14) && var14 != '\'') {
								var10 = true;
							}
							if (method527(var14)) {
								var12 = true;
							}
							var6++;
							var8++;
							if (var8 * 100 / (var6 - var5) > 90) {
								break label167;
							}
						}
					}
				}
			}
			if (var7 >= arg2.length && (!var11 || !var12)) {
				boolean var18 = true;
				if (var10) {
					boolean var23 = false;
					boolean var24 = false;
					if (var5 - 1 < 0 || method524(arg3[var5 - 1]) && arg3[var5 - 1] != '\'') {
						var23 = true;
					}
					if (var6 >= arg3.length || method524(arg3[var6]) && arg3[var6] != '\'') {
						var24 = true;
					}
					if (!var23 || !var24) {
						boolean var25 = false;
						int var26 = var5 - 2;
						if (var23) {
							var26 = var5;
						}
						while (!var25 && var26 < var6) {
							if (var26 >= 0 && (!method524(arg3[var26]) || arg3[var26] == '\'')) {
								char[] var27 = new char[3];
								int var28;
								for (var28 = 0; var28 < 3 && var26 + var28 < arg3.length && (!method524(arg3[var26 + var28]) || arg3[var26 + var28] == '\''); var28++) {
									var27[var28] = arg3[var26 + var28];
								}
								boolean var29 = true;
								if (var28 == 0) {
									var29 = false;
								}
								if (var28 < 3 && var26 - 1 >= 0 && (!method524(arg3[var26 - 1]) || arg3[var26 - 1] == '\'')) {
									var29 = false;
								}
								if (var29 && !method530(var27)) {
									var25 = true;
								}
							}
							var26++;
						}
						if (!var25) {
							var18 = false;
						}
					}
				} else {
					char var19 = ' ';
					if (var5 - 1 >= 0) {
						var19 = arg3[var5 - 1];
					}
					char var20 = ' ';
					if (var6 < arg3.length) {
						var20 = arg3[var6];
					}
					byte var21 = method520(var19, (byte) 7);
					byte var22 = method520(var20, (byte) 7);
					if (arg0 != null && method517(var22, arg0, var21)) {
						var18 = false;
					}
				}
				if (var18) {
					int var30 = 0;
					int var31 = 0;
					int var32 = -1;
					for (int var33 = var5; var33 < var6; var33++) {
						if (method527(arg3[var33])) {
							var30++;
						} else if (method526(arg3[var33])) {
							var31++;
							var32 = var33;
						}
					}
					if (var32 > -1) {
						var30 -= var6 - 1 - var32;
					}
					if (var30 <= var31) {
						for (int var34 = var5; var34 < var6; var34++) {
							arg3[var34] = '*';
						}
					} else {
						var9 = 1;
					}
				}
			}
		}
	}

	@ObfuscatedName("WXKKTWFB.a(B[[BBI)Z")
	public static boolean method517(byte arg0, byte[][] arg1, byte arg2) {
		int var4 = 0;
		if (arg1[var4][0] == arg2 && arg1[var4][1] == arg0) {
			return true;
		} else {
			int var5 = arg1.length - 1;
			if (arg1[var5][0] == arg2 && arg1[var5][1] == arg0) {
				return true;
			}
			do {
				int var6 = (var4 + var5) / 2;
				if (arg1[var6][0] == arg2 && arg1[var6][1] == arg0) {
					return true;
				}
				if (arg2 < arg1[var6][0] || arg1[var6][0] == arg2 && arg0 < arg1[var6][1]) {
					var5 = var6;
				} else {
					var4 = var6;
				}
			} while (var4 != var5 && var4 + 1 != var5);
			return false;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(CICC)I")
	public static int method518(char arg0, char arg2, char arg3) {
		if (arg0 == arg2) {
			return 1;
		} else if (arg2 == 'o' && arg0 == '0') {
			return 1;
		} else if (arg2 == 'o' && arg0 == '(' && arg3 == ')') {
			return 2;
		} else if (arg2 == 'c' && (arg0 == '(' || arg0 == '<' || arg0 == '[')) {
			return 1;
		} else if (arg2 == 'e' && arg0 == 8364) {
			return 1;
		} else if (arg2 == 's' && arg0 == '$') {
			return 1;
		} else if (arg2 == 'l' && arg0 == 'i') {
			return 1;
		} else {
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(CCCI)I")
	public static int method519(char arg0, char arg1, char arg2) {
		if (arg0 == arg1) {
			return 1;
		}
		if (arg0 >= 'a' && arg0 <= 'm') {
			if (arg0 == 'a') {
				if (arg1 != '4' && arg1 != '@' && arg1 != '^') {
					if (arg1 == '/' && arg2 == '\\') {
						return 2;
					}
					return 0;
				}
				return 1;
			}
			if (arg0 == 'b') {
				if (arg1 != '6' && arg1 != '8') {
					if ((arg1 != '1' || arg2 != '3') && (arg1 != 'i' || arg2 != '3')) {
						return 0;
					}
					return 2;
				}
				return 1;
			}
			if (arg0 == 'c') {
				if (arg1 != '(' && arg1 != '<' && arg1 != '{' && arg1 != '[') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'd') {
				if ((arg1 != '[' || arg2 != ')') && (arg1 != 'i' || arg2 != ')')) {
					return 0;
				}
				return 2;
			}
			if (arg0 == 'e') {
				if (arg1 != '3' && arg1 != 8364) {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'f') {
				if (arg1 == 'p' && arg2 == 'h') {
					return 2;
				}
				if (arg1 == 163) {
					return 1;
				}
				return 0;
			}
			if (arg0 == 'g') {
				if (arg1 != '9' && arg1 != '6' && arg1 != 'q') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'h') {
				if (arg1 == '#') {
					return 1;
				}
				return 0;
			}
			if (arg0 == 'i') {
				if (arg1 != 'y' && arg1 != 'l' && arg1 != 'j' && arg1 != '1' && arg1 != '!' && arg1 != ':' && arg1 != ';' && arg1 != '|') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'j') {
				return 0;
			}
			if (arg0 == 'k') {
				return 0;
			}
			if (arg0 == 'l') {
				if (arg1 != '1' && arg1 != '|' && arg1 != 'i') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'm') {
				return 0;
			}
		}
		if (arg0 >= 'n' && arg0 <= 'z') {
			if (arg0 == 'n') {
				return 0;
			}
			if (arg0 == 'o') {
				if (arg1 != '0' && arg1 != '*') {
					if ((arg1 != '(' || arg2 != ')') && (arg1 != '[' || arg2 != ']') && (arg1 != '{' || arg2 != '}') && (arg1 != '<' || arg2 != '>')) {
						return 0;
					}
					return 2;
				}
				return 1;
			}
			if (arg0 == 'p') {
				return 0;
			}
			if (arg0 == 'q') {
				return 0;
			}
			if (arg0 == 'r') {
				return 0;
			}
			if (arg0 == 's') {
				if (arg1 != '5' && arg1 != 'z' && arg1 != '$' && arg1 != '2') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 't') {
				if (arg1 != '7' && arg1 != '+') {
					return 0;
				}
				return 1;
			}
			if (arg0 == 'u') {
				if (arg1 == 'v') {
					return 1;
				}
				if ((arg1 != '\\' || arg2 != '/') && (arg1 != '\\' || arg2 != '|') && (arg1 != '|' || arg2 != '/')) {
					return 0;
				}
				return 2;
			}
			if (arg0 == 'v') {
				if ((arg1 != '\\' || arg2 != '/') && (arg1 != '\\' || arg2 != '|') && (arg1 != '|' || arg2 != '/')) {
					return 0;
				}
				return 2;
			}
			if (arg0 == 'w') {
				if (arg1 == 'v' && arg2 == 'v') {
					return 2;
				}
				return 0;
			}
			if (arg0 == 'x') {
				if ((arg1 != ')' || arg2 != '(') && (arg1 != '}' || arg2 != '{') && (arg1 != ']' || arg2 != '[') && (arg1 != '>' || arg2 != '<')) {
					return 0;
				}
				return 2;
			}
			if (arg0 == 'y') {
				return 0;
			}
			if (arg0 == 'z') {
				return 0;
			}
		}
		if (arg0 >= '0' && arg0 <= '9') {
			if (arg0 == '0') {
				if (arg1 == 'o' || arg1 == 'O') {
					return 1;
				} else if ((arg1 != '(' || arg2 != ')') && (arg1 != '{' || arg2 != '}') && (arg1 != '[' || arg2 != ']')) {
					return 0;
				} else {
					return 2;
				}
			} else if (arg0 == '1') {
				return arg1 == 'l' ? 1 : 0;
			} else {
				return 0;
			}
		} else if (arg0 == ',') {
			return arg1 == '.' ? 1 : 0;
		} else if (arg0 == '.') {
			return arg1 == ',' ? 1 : 0;
		} else if (arg0 == '!') {
			return arg1 == 'i' ? 1 : 0;
		} else {
			return 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(CB)B")
	public static byte method520(char arg0, byte arg1) {
		if (arg0 >= 'a' && arg0 <= 'z') {
			return (byte) (arg0 - 'a' + 1);
		} else if (arg0 == '\'') {
			return 28;
		} else if (arg0 >= '0' && arg0 <= '9') {
			return (byte) (arg0 - '0' + 29);
		} else {
			return 27;
		}
	}

	@ObfuscatedName("WXKKTWFB.c(I[C)V")
	public static void method521(int arg0, char[] arg1) {
		boolean var2 = false;
		int var3 = 0;
		int var4 = 0;
		int var5 = 0;
		while (true) {
			do {
				int var6;
				if ((var6 = method522(var3, arg1)) == -1) {
					return;
				}
				boolean var7 = false;
				for (int var8 = var3; var8 >= 0 && var8 < var6 && !var7; var8++) {
					if (!method524(arg1[var8]) && !method525(arg1[var8])) {
						var7 = true;
					}
				}
				if (var7) {
					var4 = 0;
				}
				if (var4 == 0) {
					var5 = var6;
				}
				var3 = method523(var6, arg1);
				int var9 = 0;
				for (int var10 = var6; var10 < var3; var10++) {
					var9 = var9 * 10 + arg1[var10] - 48;
				}
				if (var9 <= 255 && var3 - var6 <= 8) {
					var4++;
				} else {
					var4 = 0;
				}
			} while (var4 != 4);
			for (int var11 = var5; var11 < var3; var11++) {
				arg1[var11] = '*';
			}
			var4 = 0;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(II[C)I")
	public static int method522(int arg1, char[] arg2) {
		for (int var3 = arg1; var3 < arg2.length && var3 >= 0; var3++) {
			if (arg2[var3] >= '0' && arg2[var3] <= '9') {
				return var3;
			}
		}
		return -1;
	}

	@ObfuscatedName("WXKKTWFB.b(II[C)I")
	public static int method523(int arg0, char[] arg2) {
		int var4 = arg0;
		while (true) {
			if (var4 < arg2.length && var4 >= 0) {
				if (arg2[var4] >= '0' && arg2[var4] <= '9') {
					var4++;
					continue;
				}
				return var4;
			}
			return arg2.length;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(CZ)Z")
	public static boolean method524(char arg0) {
		return !method526(arg0) && !method527(arg0);
	}

	@ObfuscatedName("WXKKTWFB.a(IC)Z")
	public static boolean method525(char arg1) {
		if (arg1 >= 'a' && arg1 <= 'z') {
			return arg1 == 'v' || arg1 == 'x' || arg1 == 'j' || arg1 == 'q' || arg1 == 'z';
		} else {
			return true;
		}
	}

	@ObfuscatedName("WXKKTWFB.a(ZC)Z")
	public static boolean method526(char arg1) {
		return arg1 >= 'a' && arg1 <= 'z' || arg1 >= 'A' && arg1 <= 'Z';
	}

	@ObfuscatedName("WXKKTWFB.b(CZ)Z")
	public static boolean method527(char arg0) {
		return arg0 >= '0' && arg0 <= '9';
	}

	@ObfuscatedName("WXKKTWFB.c(CZ)Z")
	public static boolean method528(char arg0) {
		return arg0 >= 'a' && arg0 <= 'z';
	}

	@ObfuscatedName("WXKKTWFB.b(IC)Z")
	public static boolean method529(char arg1) {
		return arg1 >= 'A' && arg1 <= 'Z';
	}

	@ObfuscatedName("WXKKTWFB.c([CI)Z")
	public static boolean method530(char[] arg0) {
		boolean var2 = true;
		for (int var3 = 0; var3 < arg0.length; var3++) {
			if (!method527(arg0[var3]) && arg0[var3] != 0) {
				var2 = false;
			}
		}
		if (var2) {
			return true;
		}
		int var5 = method531(arg0);
		int var6 = 0;
		int var7 = field1568.length - 1;
		if (field1568[var6] == var5 || field1568[var7] == var5) {
			return true;
		}
		do {
			int var8 = (var6 + var7) / 2;
			if (field1568[var8] == var5) {
				return true;
			}
			if (var5 < field1568[var8]) {
				var7 = var8;
			} else {
				var6 = var8;
			}
		} while (var6 != var7 && var6 + 1 != var7);
		return false;
	}

	@ObfuscatedName("WXKKTWFB.b([CB)I")
	public static int method531(char[] arg0) {
		if (arg0.length > 6) {
			return 0;
		}
		int var2 = 0;
		boolean var3 = false;
		for (int var4 = 0; var4 < arg0.length; var4++) {
			char var5 = arg0[arg0.length - var4 - 1];
			if (var5 >= 'a' && var5 <= 'z') {
				var2 = var2 * 38 + var5 - 'a' + 1;
			} else if (var5 == '\'') {
				var2 = var2 * 38 + 27;
			} else if (var5 >= '0' && var5 <= '9') {
				var2 = var2 * 38 + var5 - '0' + 28;
			} else if (var5 != 0) {
				return 0;
			}
		}
		return var2;
	}
}
