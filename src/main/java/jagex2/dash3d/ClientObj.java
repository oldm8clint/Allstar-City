package jagex2.dash3d;

import deob.ObfuscatedName;
import jagex2.config.ObjType;

public class ClientObj extends ModelSource {

	@ObfuscatedName("HRIUIFAV.m")
	public int field873;

	@ObfuscatedName("HRIUIFAV.o")
	public int field875;

	@ObfuscatedName("HRIUIFAV.a(B)LLZYQDKJV;")
	public Model method239() {
		ObjType var2 = ObjType.get(this.field873);
		return var2.method229(this.field875);
	}
}
