package jagex2.dash3d;

import deob.ObfuscatedName;

public class WorldRegion {

	@ObfuscatedName("RKBCLNKC.a(BIII)I")
	public static int method461(int arg1, int arg2, int arg3) {
		int var5 = arg1 & 0x3;
		if (var5 == 0) {
			return arg2;
		} else if (var5 == 1) {
			return arg3;
		} else if (var5 == 2) {
			return 7 - arg2;
		} else {
			return 7 - arg3;
		}
	}

	@ObfuscatedName("RKBCLNKC.a(IIIB)I")
	public static int method462(int arg0, int arg1, int arg2) {
		int var5 = arg2 & 0x3;
		if (var5 == 0) {
			return arg0;
		} else if (var5 == 1) {
			return 7 - arg1;
		} else if (var5 == 2) {
			return 7 - arg0;
		} else {
			return arg1;
		}
	}

	@ObfuscatedName("RKBCLNKC.a(IIIIBII)I")
	public static int method463(int arg0, int arg1, int arg2, int arg3, int arg5, int arg6) {
		if ((arg2 & 0x1) == 1) {
			int var7 = arg5;
			arg5 = arg1;
			arg1 = var7;
		}
		int var8 = arg0 & 0x3;
		if (var8 == 0) {
			return arg3;
		} else if (var8 == 1) {
			return arg6;
		} else if (var8 == 2) {
			return 7 - arg3 - (arg5 - 1);
		} else {
			return 7 - arg6 - (arg1 - 1);
		}
	}

	@ObfuscatedName("RKBCLNKC.a(IIIIIII)I")
	public static int method464(int arg0, int arg1, int arg3, int arg4, int arg5, int arg6) {
		if ((arg6 & 0x1) == 1) {
			int var7 = arg0;
			arg0 = arg5;
			arg5 = var7;
		}
		int var8 = arg1 & 0x3;
		if (var8 == 0) {
			return arg4;
		} else if (var8 == 1) {
			return 7 - arg3 - (arg0 - 1);
		} else if (var8 == 2) {
			return 7 - arg4 - (arg5 - 1);
		} else {
			return arg3;
		}
	}
}
