import java.io.*;


public class PlayerSave implements Serializable {
    public String playerPass = "";
    public String playerName = "";
    // public String connectedFrom=""; //Don't enable this yet, or the old save-files get corrupted
    public int playerPosX;
    public int playerPosY;
    public int playerHeight;
    public int playerRights;
    public int playerStatus;
    public int playerHeadIcon;
    public int[] playerItem;
    public int[] playerItemN;
    public int[] playerEquipment;
    public int[] playerEquipmentN;
    public int[] bankItems;
    public int[] bankItemsN;
    public int[] playerLevel;
    public int[] playerXP;
    public int[] playerQuest;
    public int currentHealth;
    public int maxHealth;

    public PlayerSave(Player plr) {
        playerPass = plr.playerPass;
        playerName = plr.playerName;
        playerPosX = plr.absX;
        playerPosY = plr.absY;
        playerHeight = plr.heightLevel;
        playerRights = plr.playerRights;
        playerItem = plr.playerItems;
        playerItemN = plr.playerItemsN;
        bankItems = plr.bankItems;
        bankItemsN = plr.bankItemsN;
        playerEquipment = plr.playerEquipment;
        playerEquipmentN = plr.playerEquipmentN;
        playerLevel = plr.playerLevel;
        maxHealth = plr.playerLevel[3];
        currentHealth = plr.maxHealth;
        playerXP = plr.playerXP;
        // connectedFrom = plr.connectedFrom;

    }
}
