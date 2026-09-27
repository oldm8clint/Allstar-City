package jagex2.graphics;

import deob.ObfuscatedName;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.image.ColorModel;
import java.awt.image.DirectColorModel;
import java.awt.image.ImageConsumer;
import java.awt.image.ImageObserver;
import java.awt.image.ImageProducer;

public class PixMap implements ImageProducer, ImageObserver {

	@ObfuscatedName("ISZGOOMR.c")
	public int width;

	@ObfuscatedName("ISZGOOMR.d")
	public int height;

	@ObfuscatedName("ISZGOOMR.b")
	public int[] data;

	@ObfuscatedName("ISZGOOMR.e")
	public ColorModel colorModel;

	@ObfuscatedName("ISZGOOMR.g")
	public Image image;

	@ObfuscatedName("ISZGOOMR.f")
	public ImageConsumer consumer;

	public PixMap(int height, Component c, int width) {
		this.width = width;
		this.height = height;
		this.data = new int[height * width];
		this.colorModel = new DirectColorModel(32, 16711680, 65280, 255);

		this.image = c.createImage(this);

		this.setPixels();
		c.prepareImage(this.image, this);

		this.setPixels();
		c.prepareImage(this.image, this);

		this.setPixels();
		c.prepareImage(this.image, this);

		this.bind();
	}

	@ObfuscatedName("ISZGOOMR.a(Z)V")
	public void bind() {
		Pix2D.bind(this.width, this.height, this.data);
	}

	@ObfuscatedName("ISZGOOMR.a(IILjava/awt/Graphics;Z)V")
	public void draw(int y, int x, Graphics g) {
		this.setPixels();
		g.drawImage(this.image, x, y, this);
	}

	public synchronized void addConsumer(ImageConsumer c) {
		this.consumer = c;
		c.setDimensions(this.width, this.height);
		c.setProperties(null);
		c.setColorModel(this.colorModel);
		c.setHints(14);
	}

	public synchronized boolean isConsumer(ImageConsumer arg0) {
		return this.consumer == arg0;
	}

	public synchronized void removeConsumer(ImageConsumer arg0) {
		if (this.consumer == arg0) {
			this.consumer = null;
		}
	}

	public void startProduction(ImageConsumer arg0) {
		this.addConsumer(arg0);
	}

	public void requestTopDownLeftRightResend(ImageConsumer arg0) {
		System.out.println("TDLR");
	}

	@ObfuscatedName("ISZGOOMR.a()V")
	public synchronized void setPixels() {
		if (this.consumer != null) {
			this.consumer.setPixels(0, 0, this.width, this.height, this.colorModel, this.data, 0, this.width);
			this.consumer.imageComplete(2);
		}
	}

	public boolean imageUpdate(Image arg0, int arg1, int arg2, int arg3, int arg4, int arg5) {
		return true;
	}
}
