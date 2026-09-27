package jagex2.graphics;

import deob.ObfuscatedName;
import jagex2.datastruct.DoublyLinkable;

public class Pix2D extends DoublyLinkable {

	@ObfuscatedName("LFYNQWSZ.m")
	public static int width2d;

	@ObfuscatedName("LFYNQWSZ.n")
	public static int height2d;

	@ObfuscatedName("LFYNQWSZ.o")
	public static int top;

	@ObfuscatedName("LFYNQWSZ.p")
	public static int bottom;

	@ObfuscatedName("LFYNQWSZ.q")
	public static int left;

	@ObfuscatedName("LFYNQWSZ.r")
	public static int right;

	@ObfuscatedName("LFYNQWSZ.s")
	public static int safeWidth;

	@ObfuscatedName("LFYNQWSZ.t")
	public static int centerX2d;

	@ObfuscatedName("LFYNQWSZ.u")
	public static int centerY2d;

	@ObfuscatedName("LFYNQWSZ.l")
	public static int[] data;

	@ObfuscatedName("LFYNQWSZ.a(ZII[I)V")
	public static void bind(int width, int height, int[] src) {
		data = src;
		width2d = width;
		height2d = height;
		setClipping(0, 0, height, width);
	}

	@ObfuscatedName("LFYNQWSZ.a(B)V")
	public static void resetClipping() {
		left = 0;
		top = 0;
		right = width2d;
		bottom = height2d;
		safeWidth = right - 1;
		centerX2d = right / 2;
	}

	@ObfuscatedName("LFYNQWSZ.a(IIIIZ)V")
	public static void setClipping(int top, int left, int bottom, int right) {
		if (left < 0) {
			left = 0;
		}

		if (top < 0) {
			top = 0;
		}

		if (right > width2d) {
			right = width2d;
		}

		if (bottom > height2d) {
			bottom = height2d;
		}

		Pix2D.left = left;
		Pix2D.top = top;
		Pix2D.right = right;
		Pix2D.bottom = bottom;
		safeWidth = Pix2D.right - 1;
		centerX2d = Pix2D.right / 2;
		centerY2d = Pix2D.bottom / 2;
	}

	@ObfuscatedName("LFYNQWSZ.a(I)V")
	public static void cls() {
		int length = height2d * width2d;
		for (int i = 0; i < length; i++) {
			data[i] = 0;
		}
	}

	@ObfuscatedName("LFYNQWSZ.a(ZIIIIII)V")
	public static void fillRectTrans(int colour, int y, int width, int height, int alpha, int x) {
		if (x < left) {
			width -= left - x;
			x = left;
		}

		if (y < top) {
			height -= top - y;
			y = top;
		}

		if (width + x > right) {
			width = right - x;
		}

		if (y + height > bottom) {
			height = bottom - y;
		}

		int invAlpha = 256 - alpha;
		int r0 = (colour >> 16 & 0xFF) * alpha;
		int g0 = (colour >> 8 & 0xFF) * alpha;
		int b0 = (colour & 0xFF) * alpha;

		int step = width2d - width;
		int offset = width2d * y + x;

		for (int i = 0; i < height; i++) {
			for (int j = -width; j < 0; j++) {
				int r1 = (data[offset] >> 16 & 0xFF) * invAlpha;
				int g1 = (data[offset] >> 8 & 0xFF) * invAlpha;
				int b1 = (data[offset] & 0xFF) * invAlpha;
				int rgb = (b0 + b1 >> 8) + (r0 + r1 >> 8 << 16) + (g0 + g1 >> 8 << 8);
				data[offset++] = rgb;
			}

			offset += step;
		}
	}

	@ObfuscatedName("LFYNQWSZ.a(IIIBII)V")
	public static void fillRect(int height, int y, int colour, int width, int x) {
		if (x < left) {
			width -= left - x;
			x = left;
		}

		if (y < top) {
			height -= top - y;
			y = top;
		}

		if (width + x > right) {
			width = right - x;
		}

		if (height + y > bottom) {
			height = bottom - y;
		}

		int step = width2d - width;
		int offset = width2d * y + x;

		for (int i = -height; i < 0; i++) {
			for (int j = -width; j < 0; j++) {
				data[offset++] = colour;
			}

			offset += step;
		}
	}

	@ObfuscatedName("LFYNQWSZ.a(IIIIII)V")
	public static void drawRect(int y, int height, int colour, int x, int width) {
		hline(x, colour, y, width);
		hline(x, colour, y + height - 1, width);
		vline(x, colour, height, y);
		vline(x + width - 1, colour, height, y);
	}

	@ObfuscatedName("LFYNQWSZ.a(IIIIIIB)V")
	public static void drawRectTrans(int arg0, int arg1, int arg2, int arg3, int arg4, int arg5) {
		hlineTrans(arg4, arg0, arg1, arg5, arg2);
		hlineTrans(arg3 + arg4 - 1, arg0, arg1, arg5, arg2);
		if (arg3 >= 3) {
			vlineTrans(arg4 + 1, arg0, arg2, arg3 - 2, arg5);
			vlineTrans(arg4 + 1, arg0 + arg1 - 1, arg2, arg3 - 2, arg5);
		}
	}

	@ObfuscatedName("LFYNQWSZ.b(IIIIZ)V")
	public static void hline(int x, int colour, int y, int width) {
		if (y < top || y >= bottom) {
			return;
		}

		if (x < left) {
			width -= left - x;
			x = left;
		}

		if (x + width > right) {
			width = right - x;
		}

		int offset = width2d * y + x;

		for (int i = 0; i < width; i++) {
			data[offset + i] = colour;
		}
	}

	@ObfuscatedName("LFYNQWSZ.b(IIIIII)V")
	public static void hlineTrans(int y, int x, int width, int alpha, int colour) {
		if (y < top || y >= bottom) {
			return;
		}

		if (x < left) {
			width -= left - x;
			x = left;
		}

		if (x + width > right) {
			width = right - x;
		}

		int invAlpha = 256 - alpha;
		int r0 = (colour >> 16 & 0xFF) * alpha;
		int g0 = (colour >> 8 & 0xFF) * alpha;
		int b0 = (colour & 0xFF) * alpha;

		int offset = width2d * y + x;

		for (int i = 0; i < width; i++) {
			int r1 = (data[offset] >> 16 & 0xFF) * invAlpha;
			int g1 = (data[offset] >> 8 & 0xFF) * invAlpha;
			int b1 = (data[offset] & 0xFF) * invAlpha;
			int rgb = (b0 + b1 >> 8) + (r0 + r1 >> 8 << 16) + (g0 + g1 >> 8 << 8);
			data[offset++] = rgb;
		}
	}

	@ObfuscatedName("LFYNQWSZ.a(IIIZI)V")
	public static void vline(int x, int arg1, int height, int y) {
		if (x < left || x >= right) {
			return;
		}

		if (y < top) {
			height -= top - y;
			y = top;
		}

		if (height + y > bottom) {
			height = bottom - y;
		}

		int offset = width2d * y + x;

		for (int i = 0; i < height; i++) {
			data[width2d * i + offset] = arg1;
		}
	}

	@ObfuscatedName("LFYNQWSZ.c(IIIIII)V")
	public static void vlineTrans(int y, int x, int colour, int height, int alpha) {
		if (x < left || x >= right) {
			return;
		}

		if (y < top) {
			height -= top - y;
			y = top;
		}

		if (y + height > bottom) {
			height = bottom - y;
		}

		int invAlpha = 256 - alpha;
		int r0 = (colour >> 16 & 0xFF) * alpha;
		int g0 = (colour >> 8 & 0xFF) * alpha;
		int b0 = (colour & 0xFF) * alpha;

		int offset = width2d * y + x;

		for (int i = 0; i < height; i++) {
			int r1 = (data[offset] >> 16 & 0xFF) * invAlpha;
			int g1 = (data[offset] >> 8 & 0xFF) * invAlpha;
			int b1 = (data[offset] & 0xFF) * invAlpha;
			int rgb = (b0 + b1 >> 8) + (r0 + r1 >> 8 << 16) + (g0 + g1 >> 8 << 8);
			data[offset] = rgb;

			offset += width2d;
		}
	}
}
