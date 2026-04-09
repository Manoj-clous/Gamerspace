#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "games/engine.h"

int main(int argc, char* argv[]) {
    if (argc < 3) {
        printf("Usage: test_hs <get|set> <dino|flappy> [score]\n");
        return 1;
    }

    const char* action = argv[1];
    const char* game = argv[2];
    GameType type = GAME_NONE;

    if (strcmp(game, "dino") == 0) type = GAME_DINO;
    else if (strcmp(game, "flappy") == 0) type = GAME_FLAPPY;

    if (type == GAME_NONE) {
        printf("Invalid game specified.\n");
        return 1;
    }

    if (strcmp(action, "get") == 0) {
        int score = 0;
        load_high_score(type, &score);
        printf("%d\n", score);
    } else if (strcmp(action, "set") == 0) {
        if (argc < 4) {
            printf("Score required for set action.\n");
            return 1;
        }
        int score = atoi(argv[3]);
        int current = 0;
        load_high_score(type, &current);
        if (score > current) {
            save_high_score(type, score);
            printf("%d\n", score);
        } else {
            printf("%d\n", current);
        }
    } else {
        printf("Invalid action.\n");
        return 1;
    }

    return 0;
}
