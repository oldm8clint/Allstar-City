package jagex2.io;

import deob.ObfuscatedName;
import jagex2.client.GameShell;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

public class ClientStream implements Runnable {

	@ObfuscatedName("GXWEWMHV.f")
	public boolean field866 = false;

	@ObfuscatedName("GXWEWMHV.k")
	public boolean field871 = false;

	@ObfuscatedName("GXWEWMHV.l")
	public boolean field872 = false;

	@ObfuscatedName("GXWEWMHV.g")
	public GameShell field867;

	@ObfuscatedName("GXWEWMHV.e")
	public Socket field865;

	@ObfuscatedName("GXWEWMHV.c")
	public InputStream field863;

	@ObfuscatedName("GXWEWMHV.d")
	public OutputStream field864;

	@ObfuscatedName("GXWEWMHV.i")
	public int field869;

	@ObfuscatedName("GXWEWMHV.j")
	public int field870;

	@ObfuscatedName("GXWEWMHV.h")
	public byte[] field868;

	public ClientStream(Socket arg1, GameShell arg2) throws IOException {
		this.field867 = arg2;
		this.field865 = arg1;
		this.field865.setSoTimeout(30000);
		this.field865.setTcpNoDelay(true);
		this.field863 = this.field865.getInputStream();
		this.field864 = this.field865.getOutputStream();
	}

	@ObfuscatedName("GXWEWMHV.a()V")
	public void method233() {
		this.field866 = true;
		try {
			if (this.field863 != null) {
				this.field863.close();
			}
			if (this.field864 != null) {
				this.field864.close();
			}
			if (this.field865 != null) {
				this.field865.close();
			}
		} catch (IOException var3) {
			System.out.println("Error closing stream");
		}
		this.field871 = false;
		synchronized (this) {
			this.notify();
		}
		this.field868 = null;
	}

	@ObfuscatedName("GXWEWMHV.b()I")
	public int method234() throws IOException {
		return this.field866 ? 0 : this.field863.read();
	}

	@ObfuscatedName("GXWEWMHV.c()I")
	public int available() throws IOException {
		return this.field866 ? 0 : this.field863.available();
	}

	@ObfuscatedName("GXWEWMHV.a([BII)V")
	public void read(byte[] arg0, int arg1, int arg2) throws IOException {
		if (this.field866) {
			return;
		}
		while (arg2 > 0) {
			int var4 = this.field863.read(arg0, arg1, arg2);
			if (var4 <= 0) {
				throw new IOException("EOF");
			}
			arg1 += var4;
			arg2 -= var4;
		}
	}

	@ObfuscatedName("GXWEWMHV.a(III[B)V")
	public void write(int arg1, int arg2, byte[] arg3) throws IOException {
		if (this.field866) {
			return;
		}
		if (this.field872) {
			this.field872 = false;
			throw new IOException("Error in writer thread");
		}
		if (this.field868 == null) {
			this.field868 = new byte[5000];
		}
		synchronized (this) {
			for (int var6 = 0; var6 < arg1; var6++) {
				this.field868[this.field870] = arg3[arg2 + var6];
				this.field870 = (this.field870 + 1) % 5000;
				if ((this.field869 + 4900) % 5000 == this.field870) {
					throw new IOException("buffer overflow");
				}
			}
			if (!this.field871) {
				this.field871 = true;
				this.field867.startThread(this, 3);
			}
			this.notify();
		}
	}

	public void run() {
		while (this.field871) {
			int var2;
			int var3;
			label54: {
				synchronized (this) {
					if (this.field870 == this.field869) {
						try {
							this.wait();
						} catch (InterruptedException var7) {
						}
					}
					if (this.field871) {
						var2 = this.field869;
						if (this.field870 >= this.field869) {
							var3 = this.field870 - this.field869;
						} else {
							var3 = 5000 - this.field869;
						}
						break label54;
					}
				}
				return;
			}
			if (var3 > 0) {
				try {
					this.field864.write(this.field868, var2, var3);
				} catch (IOException var6) {
					this.field872 = true;
				}
				this.field869 = (this.field869 + var3) % 5000;
				try {
					if (this.field870 == this.field869) {
						this.field864.flush();
					}
				} catch (IOException var5) {
					this.field872 = true;
				}
			}
		}
	}

	@ObfuscatedName("GXWEWMHV.a(Z)V")
	public void method238() {
		System.out.println("dummy:" + this.field866);
		System.out.println("tcycl:" + this.field869);
		System.out.println("tnum:" + this.field870);
		System.out.println("writer:" + this.field871);
		System.out.println("ioerror:" + this.field872);
		try {
			System.out.println("available:" + this.available());
		} catch (IOException var2) {
		}
	}
}
