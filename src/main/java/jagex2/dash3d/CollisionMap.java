package jagex2.dash3d;

import deob.ObfuscatedName;

public class CollisionMap {

	@ObfuscatedName("XRENONSA.f")
	public int field1581 = 0;

	@ObfuscatedName("XRENONSA.g")
	public int field1582;

	@ObfuscatedName("XRENONSA.h")
	public int field1583;

	@ObfuscatedName("XRENONSA.i")
	public int field1584;

	@ObfuscatedName("XRENONSA.j")
	public int[][] field1585;

	public CollisionMap(int arg0, int arg2) {
		this.field1582 = 0;
		this.field1583 = arg2;
		this.field1584 = arg0;
		this.field1585 = new int[this.field1583][this.field1584];
		this.method532();
	}

	@ObfuscatedName("XRENONSA.a()V")
	public void method532() {
		for (int var1 = 0; var1 < this.field1583; var1++) {
			for (int var2 = 0; var2 < this.field1584; var2++) {
				if (var1 == 0 || var2 == 0 || this.field1583 - 1 == var1 || this.field1584 - 1 == var2) {
					this.field1585[var1][var2] = 16777215;
				} else {
					this.field1585[var1][var2] = 16777216;
				}
			}
		}
	}

	@ObfuscatedName("XRENONSA.a(IIZIII)V")
	public void method533(int arg0, boolean arg2, int arg3, int arg4, int arg5) {
		int var7 = arg4 - this.field1581;
		int var8 = arg5 - this.field1582;
		if (arg3 == 0) {
			if (arg0 == 0) {
				this.method536(var7, var8, 128);
				this.method536(var7 - 1, var8, 8);
			}
			if (arg0 == 1) {
				this.method536(var7, var8, 2);
				this.method536(var7, var8 + 1, 32);
			}
			if (arg0 == 2) {
				this.method536(var7, var8, 8);
				this.method536(var7 + 1, var8, 128);
			}
			if (arg0 == 3) {
				this.method536(var7, var8, 32);
				this.method536(var7, var8 - 1, 2);
			}
		}
		if (arg3 == 1 || arg3 == 3) {
			if (arg0 == 0) {
				this.method536(var7, var8, 1);
				this.method536(var7 - 1, var8 + 1, 16);
			}
			if (arg0 == 1) {
				this.method536(var7, var8, 4);
				this.method536(var7 + 1, var8 + 1, 64);
			}
			if (arg0 == 2) {
				this.method536(var7, var8, 16);
				this.method536(var7 + 1, var8 - 1, 1);
			}
			if (arg0 == 3) {
				this.method536(var7, var8, 64);
				this.method536(var7 - 1, var8 - 1, 4);
			}
		}
		if (arg3 == 2) {
			if (arg0 == 0) {
				this.method536(var7, var8, 130);
				this.method536(var7 - 1, var8, 8);
				this.method536(var7, var8 + 1, 32);
			}
			if (arg0 == 1) {
				this.method536(var7, var8, 10);
				this.method536(var7, var8 + 1, 32);
				this.method536(var7 + 1, var8, 128);
			}
			if (arg0 == 2) {
				this.method536(var7, var8, 40);
				this.method536(var7 + 1, var8, 128);
				this.method536(var7, var8 - 1, 2);
			}
			if (arg0 == 3) {
				this.method536(var7, var8, 160);
				this.method536(var7, var8 - 1, 2);
				this.method536(var7 - 1, var8, 8);
			}
		}
		if (arg2) {
			if (arg3 == 0) {
				if (arg0 == 0) {
					this.method536(var7, var8, 65536);
					this.method536(var7 - 1, var8, 4096);
				}
				if (arg0 == 1) {
					this.method536(var7, var8, 1024);
					this.method536(var7, var8 + 1, 16384);
				}
				if (arg0 == 2) {
					this.method536(var7, var8, 4096);
					this.method536(var7 + 1, var8, 65536);
				}
				if (arg0 == 3) {
					this.method536(var7, var8, 16384);
					this.method536(var7, var8 - 1, 1024);
				}
			}
			if (arg3 == 1 || arg3 == 3) {
				if (arg0 == 0) {
					this.method536(var7, var8, 512);
					this.method536(var7 - 1, var8 + 1, 8192);
				}
				if (arg0 == 1) {
					this.method536(var7, var8, 2048);
					this.method536(var7 + 1, var8 + 1, 32768);
				}
				if (arg0 == 2) {
					this.method536(var7, var8, 8192);
					this.method536(var7 + 1, var8 - 1, 512);
				}
				if (arg0 == 3) {
					this.method536(var7, var8, 32768);
					this.method536(var7 - 1, var8 - 1, 2048);
				}
			}
			if (arg3 == 2) {
				if (arg0 == 0) {
					this.method536(var7, var8, 66560);
					this.method536(var7 - 1, var8, 4096);
					this.method536(var7, var8 + 1, 16384);
				}
				if (arg0 == 1) {
					this.method536(var7, var8, 5120);
					this.method536(var7, var8 + 1, 16384);
					this.method536(var7 + 1, var8, 65536);
				}
				if (arg0 == 2) {
					this.method536(var7, var8, 20480);
					this.method536(var7 + 1, var8, 65536);
					this.method536(var7, var8 - 1, 1024);
				}
				if (arg0 == 3) {
					this.method536(var7, var8, 81920);
					this.method536(var7, var8 - 1, 1024);
					this.method536(var7 - 1, var8, 4096);
				}
			}
		}
	}

	@ObfuscatedName("XRENONSA.a(IIIIZIB)V")
	public void method534(int arg0, int arg1, int arg2, int arg3, boolean arg4, int arg5) {
		int var8 = 256;
		if (arg4) {
			var8 += 131072;
		}
		int var9 = arg5 - this.field1581;
		int var10 = arg0 - this.field1582;
		if (arg1 == 1 || arg1 == 3) {
			int var11 = arg3;
			arg3 = arg2;
			arg2 = var11;
		}
		for (int var12 = var9; var12 < arg3 + var9; var12++) {
			if (var12 >= 0 && var12 < this.field1583) {
				for (int var13 = var10; var13 < arg2 + var10; var13++) {
					if (var13 >= 0 && var13 < this.field1584) {
						this.method536(var12, var13, var8);
					}
				}
			}
		}
	}

	@ObfuscatedName("XRENONSA.a(III)V")
	public void method535(int arg1, int arg2) {
		int var4 = arg2 - this.field1581;
		int var5 = arg1 - this.field1582;
		this.field1585[var4][var5] |= 0x200000;
	}

	@ObfuscatedName("XRENONSA.b(III)V")
	public void method536(int arg0, int arg1, int arg2) {
		this.field1585[arg0][arg1] |= arg2;
	}

	@ObfuscatedName("XRENONSA.a(IIIIIZ)V")
	public void method537(int arg0, int arg1, int arg3, int arg4, boolean arg5) {
		int var7 = arg1 - this.field1581;
		int var8 = arg3 - this.field1582;
		if (arg4 == 0) {
			if (arg0 == 0) {
				this.method539(var7, 128, var8);
				this.method539(var7 - 1, 8, var8);
			}
			if (arg0 == 1) {
				this.method539(var7, 2, var8);
				this.method539(var7, 32, var8 + 1);
			}
			if (arg0 == 2) {
				this.method539(var7, 8, var8);
				this.method539(var7 + 1, 128, var8);
			}
			if (arg0 == 3) {
				this.method539(var7, 32, var8);
				this.method539(var7, 2, var8 - 1);
			}
		}
		if (arg4 == 1 || arg4 == 3) {
			if (arg0 == 0) {
				this.method539(var7, 1, var8);
				this.method539(var7 - 1, 16, var8 + 1);
			}
			if (arg0 == 1) {
				this.method539(var7, 4, var8);
				this.method539(var7 + 1, 64, var8 + 1);
			}
			if (arg0 == 2) {
				this.method539(var7, 16, var8);
				this.method539(var7 + 1, 1, var8 - 1);
			}
			if (arg0 == 3) {
				this.method539(var7, 64, var8);
				this.method539(var7 - 1, 4, var8 - 1);
			}
		}
		if (arg4 == 2) {
			if (arg0 == 0) {
				this.method539(var7, 130, var8);
				this.method539(var7 - 1, 8, var8);
				this.method539(var7, 32, var8 + 1);
			}
			if (arg0 == 1) {
				this.method539(var7, 10, var8);
				this.method539(var7, 32, var8 + 1);
				this.method539(var7 + 1, 128, var8);
			}
			if (arg0 == 2) {
				this.method539(var7, 40, var8);
				this.method539(var7 + 1, 128, var8);
				this.method539(var7, 2, var8 - 1);
			}
			if (arg0 == 3) {
				this.method539(var7, 160, var8);
				this.method539(var7, 2, var8 - 1);
				this.method539(var7 - 1, 8, var8);
			}
		}
		if (arg5) {
			if (arg4 == 0) {
				if (arg0 == 0) {
					this.method539(var7, 65536, var8);
					this.method539(var7 - 1, 4096, var8);
				}
				if (arg0 == 1) {
					this.method539(var7, 1024, var8);
					this.method539(var7, 16384, var8 + 1);
				}
				if (arg0 == 2) {
					this.method539(var7, 4096, var8);
					this.method539(var7 + 1, 65536, var8);
				}
				if (arg0 == 3) {
					this.method539(var7, 16384, var8);
					this.method539(var7, 1024, var8 - 1);
				}
			}
			if (arg4 == 1 || arg4 == 3) {
				if (arg0 == 0) {
					this.method539(var7, 512, var8);
					this.method539(var7 - 1, 8192, var8 + 1);
				}
				if (arg0 == 1) {
					this.method539(var7, 2048, var8);
					this.method539(var7 + 1, 32768, var8 + 1);
				}
				if (arg0 == 2) {
					this.method539(var7, 8192, var8);
					this.method539(var7 + 1, 512, var8 - 1);
				}
				if (arg0 == 3) {
					this.method539(var7, 32768, var8);
					this.method539(var7 - 1, 2048, var8 - 1);
				}
			}
			if (arg4 == 2) {
				if (arg0 == 0) {
					this.method539(var7, 66560, var8);
					this.method539(var7 - 1, 4096, var8);
					this.method539(var7, 16384, var8 + 1);
				}
				if (arg0 == 1) {
					this.method539(var7, 5120, var8);
					this.method539(var7, 16384, var8 + 1);
					this.method539(var7 + 1, 65536, var8);
				}
				if (arg0 == 2) {
					this.method539(var7, 20480, var8);
					this.method539(var7 + 1, 65536, var8);
					this.method539(var7, 1024, var8 - 1);
				}
				if (arg0 == 3) {
					this.method539(var7, 81920, var8);
					this.method539(var7, 1024, var8 - 1);
					this.method539(var7 - 1, 4096, var8);
				}
			}
		}
	}

	@ObfuscatedName("XRENONSA.a(IIIIIZI)V")
	public void method538(int arg1, int arg2, int arg3, int arg4, boolean arg5, int arg6) {
		int var8 = 256;
		if (arg5) {
			var8 += 131072;
		}
		int var9 = arg2 - this.field1581;
		int var10 = arg1 - this.field1582;
		if (arg3 == 1 || arg3 == 3) {
			int var11 = arg6;
			arg6 = arg4;
			arg4 = var11;
		}
		for (int var12 = var9; var12 < arg6 + var9; var12++) {
			if (var12 >= 0 && var12 < this.field1583) {
				for (int var13 = var10; var13 < arg4 + var10; var13++) {
					if (var13 >= 0 && var13 < this.field1584) {
						this.method539(var12, var8, var13);
					}
				}
			}
		}
	}

	@ObfuscatedName("XRENONSA.a(IIBI)V")
	public void method539(int arg0, int arg1, int arg3) {
		this.field1585[arg0][arg3] &= 16777215 - arg1;
	}

	@ObfuscatedName("XRENONSA.a(IBI)V")
	public void method540(int arg0, int arg2) {
		int var4 = arg0 - this.field1581;
		int var5 = arg2 - this.field1582;
		this.field1585[var4][var5] &= 0xDFFFFF;
	}

	@ObfuscatedName("XRENONSA.a(IIIIIII)Z")
	public boolean method541(int arg0, int arg2, int arg3, int arg4, int arg5, int arg6) {
		if (arg0 == arg4 && arg2 == arg5) {
			return true;
		}
		int var8 = arg4 - this.field1581;
		int var9 = arg5 - this.field1582;
		int var10 = arg0 - this.field1581;
		int var11 = arg2 - this.field1582;
		if (arg3 == 0) {
			if (arg6 == 0) {
				if (var10 - 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x1280120) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x1280102) == 0) {
					return true;
				}
			} else if (arg6 == 1) {
				if (var8 == var10 && var11 + 1 == var9) {
					return true;
				}
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280108) == 0) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280180) == 0) {
					return true;
				}
			} else if (arg6 == 2) {
				if (var10 + 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x1280120) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x1280102) == 0) {
					return true;
				}
			} else if (arg6 == 3) {
				if (var8 == var10 && var11 - 1 == var9) {
					return true;
				}
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280108) == 0) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280180) == 0) {
					return true;
				}
			}
		}
		if (arg3 == 2) {
			if (arg6 == 0) {
				if (var10 - 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280180) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x1280102) == 0) {
					return true;
				}
			} else if (arg6 == 1) {
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280108) == 0) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x1280102) == 0) {
					return true;
				}
			} else if (arg6 == 2) {
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280108) == 0) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x1280120) == 0) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9) {
					return true;
				}
			} else if (arg6 == 3) {
				if (var10 - 1 == var8 && var9 == var11) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x1280120) == 0) {
					return true;
				}
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x1280180) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9) {
					return true;
				}
			}
		}
		if (arg3 == 9) {
			if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x20) == 0) {
				return true;
			}
			if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x2) == 0) {
				return true;
			}
			if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x8) == 0) {
				return true;
			}
			if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x80) == 0) {
				return true;
			}
		}
		return false;
	}

	@ObfuscatedName("XRENONSA.b(IIIIIII)Z")
	public boolean method542(int arg1, int arg2, int arg3, int arg4, int arg5, int arg6) {
		if (arg2 == arg3 && arg1 == arg6) {
			return true;
		}
		int var8 = arg3 - this.field1581;
		int var9 = arg1 - this.field1582;
		int var10 = arg2 - this.field1581;
		int var11 = arg6 - this.field1582;
		if (arg5 == 6 || arg5 == 7) {
			if (arg5 == 7) {
				arg4 = arg4 + 2 & 0x3;
			}
			if (arg4 == 0) {
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x80) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x2) == 0) {
					return true;
				}
			} else if (arg4 == 1) {
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x8) == 0) {
					return true;
				}
				if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x2) == 0) {
					return true;
				}
			} else if (arg4 == 2) {
				if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x8) == 0) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x20) == 0) {
					return true;
				}
			} else if (arg4 == 3) {
				if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x80) == 0) {
					return true;
				}
				if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x20) == 0) {
					return true;
				}
			}
		}
		if (arg5 == 8) {
			if (var8 == var10 && var11 + 1 == var9 && (this.field1585[var8][var9] & 0x20) == 0) {
				return true;
			}
			if (var8 == var10 && var11 - 1 == var9 && (this.field1585[var8][var9] & 0x2) == 0) {
				return true;
			}
			if (var10 - 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x8) == 0) {
				return true;
			}
			if (var10 + 1 == var8 && var9 == var11 && (this.field1585[var8][var9] & 0x80) == 0) {
				return true;
			}
		}
		return false;
	}

	@ObfuscatedName("XRENONSA.a(IIZIIIII)Z")
	public boolean method543(int arg0, int arg1, int arg3, int arg4, int arg5, int arg6, int arg7) {
		int var9 = arg0 + arg3 - 1;
		int var10 = arg5 + arg6 - 1;
		if (arg1 >= arg3 && arg1 <= var9 && arg7 >= arg6 && arg7 <= var10) {
			return true;
		} else if (arg3 - 1 == arg1 && arg7 >= arg6 && arg7 <= var10 && (this.field1585[arg1 - this.field1581][arg7 - this.field1582] & 0x8) == 0 && (arg4 & 0x8) == 0) {
			return true;
		} else if (var9 + 1 == arg1 && arg7 >= arg6 && arg7 <= var10 && (this.field1585[arg1 - this.field1581][arg7 - this.field1582] & 0x80) == 0 && (arg4 & 0x2) == 0) {
			return true;
		} else if (arg6 - 1 == arg7 && arg1 >= arg3 && arg1 <= var9 && (this.field1585[arg1 - this.field1581][arg7 - this.field1582] & 0x2) == 0 && (arg4 & 0x4) == 0) {
			return true;
		} else {
			return var10 + 1 == arg7 && arg1 >= arg3 && arg1 <= var9 && (this.field1585[arg1 - this.field1581][arg7 - this.field1582] & 0x20) == 0 && (arg4 & 0x1) == 0;
		}
	}
}
