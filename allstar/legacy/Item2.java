// This file is free software; you can redistribute it and/or modify it under
// the terms of the GNU General Public License version 2, 1991 as published by
// the Free Software Foundation.

// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
// details.

// A copy of the GNU General Public License can be found at:
// http://www.gnu.org/licenses/gpl.html

// a collection of item methods
import java.io.*;


public class Item2 {
    public static int runerock[] = {
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 1481, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451, 451,
        451, 451, 451, 451, 451, 451};

    public static int randomRuneRock() {
        return runerock[(int) (Math.random() * runerock.length)];
    }	

    public static int Silvchest[] = { 601, 758, 788, 983};

    public static int randomSilvchest() {
        return Silvchest[(int) (Math.random() * Silvchest.length)];
    }

    public static int fish[] = { 385, 385, 379, 379, 379, 379, 379};

    public static int randomFish() {
        return fish[(int) (Math.random() * fish.length)];
    }	
    public static int rat[] = {
        5698, 1305, 3105, 1725, 1704, 1323, 1153, 1115, 1067, 1081, 1157, 1119,
        1069, 1083};

    public static int randomrat() {
        return rat[(int) (Math.random() * rat.length)];
    }
    public static int well[] = {15195, 15185, 15348, 14520, 15334, 7449, 15346,};

    public static int randomwell()
    {
    	return well[(int)(Math.random()*well.length)];
    }
    public static int soldier[] = {
        3101, 6897, 3202, 1333, 1319, 1113, 1127, 1147, 1093, 1079, 1373, 4131,
        995};

    public static int randomsoldier() {
        return soldier[(int) (Math.random() * soldier.length)];
    }
    public static int ogre[] = { 837, 5018, 995};

    public static int randomogre() {
        return ogre[(int) (Math.random() * ogre.length)];
    }
    public static int chicken[] = { 4834};

    public static int randomchicken() {
        return chicken[(int) (Math.random() * chicken.length)];
    }
    public static int skeleton[] = {
        6137, 6139, 6141, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995};

    public static int randomskeleton() {
        return skeleton[(int) (Math.random() * skeleton.length)];
    }
    public static int crawlinghand[] = {
        2615, 1333, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526};

    public static int randomcrawlinghand() {
        return crawlinghand[(int) (Math.random() * crawlinghand.length)];
    }
    public static int cavebug[] = {
        4119, 4121, 4123, 4125, 4127, 4129, 4131, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526};

    public static int randomcavebug() {
        return cavebug[(int) (Math.random() * cavebug.length)];
    }
    public static int jelly[] = {
        14860, 6809, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526};

    public static int randomjelly() {
        return jelly[(int) (Math.random() * jelly.length)];
    }
    public static int aberrantspecter[] = {
        3840, 3842, 3844, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526};

    public static int randomaberrantspecter() {
        return aberrantspecter[(int) (Math.random() * aberrantspecter.length)];
    }
    public static int abyssaldemon[] = {
        4151, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526};

    public static int randomabyssaldemon() {
        return abyssaldemon[(int) (Math.random() * abyssaldemon.length)];
    }
    public static int darkbeast[] = {
        6818, 11192, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526, 526,
        526, 526, 526, 526, 526, 526, 526, 526};

    public static int randomdarkbeast() {
        return darkbeast[(int) (Math.random() * darkbeast.length)];
    }
    public static int barbarian[] = {
        1725, 1704, 1038, 3105, 1305, 5698, 4587, 4726, 7386, 7394, 7390, 995};

    public static int randombarbarian() {
        return barbarian[(int) (Math.random() * barbarian.length)];
    }
    public static int unicorn[] = {
        6966, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995};

    public static int randomunicorn() {
        return unicorn[(int) (Math.random() * unicorn.length)];
    }
    public static int battlemagesara[] = {
        14507, 14508, 14513, 5698, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995};

    public static int randombattlemagesara() {
        return battlemagesara[(int) (Math.random() * battlemagesara.length)];
    }
    public static int battlemagezammy[] = {
        14507, 14508, 14512, 5698, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995};

    public static int randombattlemagezammy() {
        return battlemagezammy[(int) (Math.random() * battlemagezammy.length)];
    }
    public static int battlemageguthix[] = {
        14507, 14508, 14511, 5698, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995};

    public static int randombattlemageguthix() {
        return battlemageguthix[(int) (Math.random() * battlemageguthix.length)];
    }
    public static int troll[] = {
        3741, 3741, 3741, 3741, 995, 995, 995, 995, 995, 995, 995, 995, 995, 995,
        995, 995, 995, 995, 995, 995, 995, 995, 995};

    public static int randomtroll() {
        return troll[(int) (Math.random() * troll.length)];
    }

    public static int KQ[] = {
        2633, 2635, 2637, 2978, 2980, 2982, 2984, 2986, 2988, 2990, 2992, 2994,
        2957, 2653, 2655, 2659, 3478, 2665, 2661, 2663, 2667, 3479, 2673, 2669,
        2671, 3480, 4724, 4728, 4730, 4726, 6570, 1037, 1050, 6857, 6859, 6861,
        6863, 6856, 6858, 6860, 6862, 6818, 989};

    public static int randomKQ() {
        return KQ[(int) (Math.random() * KQ.length)];
    }
    public static int Ahrim[] = { 4708, 4710, 4712, 4714};
    public static int randomAhrim() {
        return Ahrim[(int) (Math.random() * Ahrim.length)];
    }

    public static int Guthan[] = { 4724, 4726, 4728, 4730};
    public static int randomGuthan() {
        return Guthan[(int) (Math.random() * Guthan.length)];
    }

    public static int Karil[] = { 4732, 4734, 4736, 4738};
    public static int randomKaril() {
        return Karil[(int) (Math.random() * Karil.length)];
    }

    public static int Torag[] = { 4745, 4747, 4749, 4751};
    public static int randomTorag() {
        return Torag[(int) (Math.random() * Torag.length)];
    }

    public static int Jogre[] = { 4587, 15352, 7158, 1149, 4151, 5698, 1377, 1305, 1434};
    public static int randomJogre() {
        return Jogre[(int) (Math.random() * Jogre.length)];
    }

    public static int Verac[] = { 4753, 4755, 4757, 4759};
    public static int randomVerac() {
        return Verac[(int) (Math.random() * Verac.length)];
    }

    public static int Dharok[] = { 4716, 4718, 4720, 4722};
    public static int randomDharok() {
        return Dharok[(int) (Math.random() * Dharok.length)];
    }

    public static int Ice_giant[] = { 1543, 1546, 1545, 1548};
    public static int randomIce_giant() {
        return Ice_giant[(int) (Math.random() * Ice_giant.length)];
    }

    public static int Dagannoth_Rex[] = { 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 15348, 15349, 532, 532, 532};
    public static int randomDagannoth_Rex() {
        return Dagannoth_Rex[(int) (Math.random() * Dagannoth_Rex.length)];
    }

    public static int Dagannoth_Prime[] = { 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 15350, 15334, 532, 532, 532};
    public static int randomDagannoth_Prime() {
        return Dagannoth_Prime[(int) (Math.random() * Dagannoth_Prime.length)];
    }

    public static int Dagannoth_Supreme[] = { 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 15185, 15195, 532, 532, 532};
    public static int randomDagannoth_Supreme() {
        return Dagannoth_Supreme[(int) (Math.random() * Dagannoth_Supreme.length)];
    }

    public static int Flambeed[] = { 6104, 991, 989};
    public static int randomFlambeed() {
        return Flambeed[(int) (Math.random() * Flambeed.length)];
    }

    public static int Black_Demon[] = { 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 14503, 14505, 14504, 532, 532, 532};
    public static int randomBlack_Demon() {
        return Black_Demon[(int) (Math.random() * Black_Demon.length)];
    }

    public static int Skeleton_Hellhound[] = { 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 14507, 14506, 14508, 14509, 532, 532, 532};
    public static int randomSkeleton_Hellhound() {
        return Skeleton_Hellhound[(int) (Math.random() * Skeleton_Hellhound.length)];
    }

    public static int Agrith_Naar[] = { 532, 532, 532, 532, 532, 532 , 532, 532, 532, 532, 532, 532, 532, 7449, 3140, 532, 532, 532};
    public static int randomAgrith_Naar() {
        return Agrith_Naar[(int) (Math.random() * Agrith_Naar.length)];
    }


    public static int Arzinian_Being_of_Bordanzan[] = { 532, 532, 532, 532, 532, 532 , 532, 532, 532, 532, 532, 532, 15345, 14521, 15346, 532, 532, 532};
    public static int randomArzinian_Being_of_Bordanzan() {
        return Arzinian_Being_of_Bordanzan[(int) (Math.random() * Arzinian_Being_of_Bordanzan.length)];
    }

    public static int KBD[] = { 15352, 15334,4585, 14519, 4087, 15195};
    public static int randomKBD() {
        return KBD[(int) (Math.random() * KBD.length)];
    }
}
