package jagex2.client;

import deob.ObfuscatedName;

public class MouseTracking implements Runnable {

	@ObfuscatedName("BORSVOPG.a")
	public boolean field94 = true;

	@ObfuscatedName("BORSVOPG.b")
	public int[] field95 = new int[500];

	@ObfuscatedName("BORSVOPG.c")
	public Object lock = new Object();

	@ObfuscatedName("BORSVOPG.g")
	public int[] field100 = new int[500];

	@ObfuscatedName("BORSVOPG.d")
	public Client field97;

	@ObfuscatedName("BORSVOPG.f")
	public int field99;

	public MouseTracking(Client arg0) {
		this.field97 = arg0;
	}

	public void run() {
		while (this.field94) {
			Object var1 = this.lock;
			synchronized (this.lock) {
				if (this.field99 < 500) {
					this.field100[this.field99] = this.field97.mouseX;
					this.field95[this.field99] = this.field97.mouseY;
					this.field99++;
				}
			}
			try {
				Thread.sleep(50L);
			} catch (Exception var2) {
			}
		}
	}
}
