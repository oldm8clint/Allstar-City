package jagex2.jstring;

import deob.ObfuscatedName;

public class JString {

	@ObfuscatedName("LJWIWXSK.e")
	public static final char[] CHARSET = new char[] { '_', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' };

	@ObfuscatedName("LJWIWXSK.a(Ljava/lang/String;)J")
	public static long toBase37(String s) {
		long hash = 0L;
		for (int i = 0; i < s.length() && i < 12; i++) {
			char c = s.charAt(i);
			hash *= 37L;

			if (c >= 'A' && c <= 'Z') {
				hash += c + 1 - 65;
			} else if (c >= 'a' && c <= 'z') {
				hash += c + 1 - 97;
			} else if (c >= '0' && c <= '9') {
				hash += c + 27 - 48;
			}
		}

		while (hash % 37L == 0L && hash != 0L) {
			hash /= 37L;
		}

		return hash;
	}

	@ObfuscatedName("LJWIWXSK.a(JI)Ljava/lang/String;")
	public static String fromBase37(long username) {
		if (username <= 0L || username >= 6582952005840035281L) {
			return "invalid_name";
		} else if (username % 37L == 0L) {
			return "invalid_name";
		}

		int len = 0;
		char[] builder = new char[12];
		while (username != 0L) {
			long last = username;
			username /= 37L;
			builder[11 - len++] = CHARSET[(int) (last - username * 37L)];
		}
		return new String(builder, 12 - len, len);
	}

	@ObfuscatedName("LJWIWXSK.a(ILjava/lang/String;)J")
	public static long hashCode(String s) {
		String upper = s.toUpperCase();

		long hash = 0L;
		for (int i = 0; i < upper.length(); i++) {
			hash = hash * 61L + (long) upper.charAt(i) - 32L;
			hash = hash + (hash >> 56) & 0xFFFFFFFFFFFFFFL;
		}

		return hash;
	}

	@ObfuscatedName("LJWIWXSK.a(II)Ljava/lang/String;")
	public static String formatIPv4(int ip) {
		return (ip >> 24 & 0xFF) + "." + (ip >> 16 & 0xFF) + "." + (ip >> 8 & 0xFF) + "." + (ip & 0xFF);
	}

	@ObfuscatedName("LJWIWXSK.a(Ljava/lang/String;B)Ljava/lang/String;")
	public static String formatDisplayName(String username) {
		if (username.length() <= 0) {
			return username;
		}

		char[] chars = username.toCharArray();
		for (int i = 0; i < chars.length; i++) {
			if (chars[i] == '_') {
				chars[i] = ' ';

				if (i + 1 < chars.length && chars[i + 1] >= 'a' && chars[i + 1] <= 'z') {
					chars[i + 1] = (char) (chars[i + 1] + 'A' - 97);
				}
			}
		}

		if (chars[0] >= 'a' && chars[0] <= 'z') {
			chars[0] = (char) (chars[0] + 'A' - 97);
		}

		return new String(chars);
	}

	@ObfuscatedName("LJWIWXSK.b(ILjava/lang/String;)Ljava/lang/String;")
	public static String censor(String s) {
		StringBuffer temp = new StringBuffer();
		for (int i = 0; i < s.length(); i++) {
			temp.append("*");
		}
		return temp.toString();
	}
}
