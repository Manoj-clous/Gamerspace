#include "engine.h"
#include <stdlib.h>
#include <stdio.h>

// Explicitly declare rand for the compiler
extern int rand(void);
#include <time.h>
#include <math.h>

GameEngine engine;

// Forward declarations
void dino_init(GameEngine* engine);
void dino_update(GameEngine* engine);
void dino_jump(GameEngine* engine);

void flappy_init(GameEngine* engine);
void flappy_update(GameEngine* engine);
void flappy_flap(GameEngine* engine);


const char* get_high_score_filename(GameType type) {
    if (type == GAME_DINO) return "dino_high.txt";
    if (type == GAME_FLAPPY) return "flappy_high.txt";
    return NULL;
}

void load_high_score(GameType type, int* highScore) {
    const char* filename = get_high_score_filename(type);
    if (!filename) return;

    FILE* f = fopen(filename, "r");
    if (f) {
        fscanf(f, "%d", highScore);
        fclose(f);
    } else {
        *highScore = 0;
    }
}

void save_high_score(GameType type, int score) {
    const char* filename = get_high_score_filename(type);
    if (!filename) return;

    FILE* f = fopen(filename, "w");
    if (f) {
        fprintf(f, "%d\n", score);
        fclose(f);
    }
}

EMSCRIPTEN_KEEPALIVE
void init_game(int type) {
    srand(time(NULL));
    engine.activeGame = (GameType)type;
    if (type == GAME_DINO) dino_init(&engine);
    else if (type == GAME_FLAPPY) flappy_init(&engine);
}

EMSCRIPTEN_KEEPALIVE
void update_game() {
    if (engine.activeGame == GAME_DINO) dino_update(&engine);
    else if (engine.activeGame == GAME_FLAPPY) flappy_update(&engine);
}

EMSCRIPTEN_KEEPALIVE
void input_event(int eventType, float x, float y, uint32_t timestamp) {
    if (engine.activeGame == GAME_DINO) {
        if (eventType == 0) dino_jump(&engine); // Jump
    } else if (engine.activeGame == GAME_FLAPPY) {
        if (eventType == 0) flappy_flap(&engine); // Flap
    }
}

EMSCRIPTEN_KEEPALIVE
void* get_state_ptr() {
    return &engine;
}

EMSCRIPTEN_KEEPALIVE
bool is_game_over() {
    if (engine.activeGame == GAME_DINO) return engine.dino.gameOver;
    if (engine.activeGame == GAME_FLAPPY) return engine.bird.gameOver;
    return false;
}

EMSCRIPTEN_KEEPALIVE
int get_score() {
    if (engine.activeGame == GAME_DINO) return engine.dino.score;
    if (engine.activeGame == GAME_FLAPPY) return engine.bird.score;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int get_high_score() {
    if (engine.activeGame == GAME_DINO) return engine.dino.highScore;
    if (engine.activeGame == GAME_FLAPPY) return engine.bird.highScore;
    return 0;
}

EMSCRIPTEN_KEEPALIVE float get_dino_x() { return engine.dino.x; }
EMSCRIPTEN_KEEPALIVE float get_dino_y() { return engine.dino.y; }
EMSCRIPTEN_KEEPALIVE bool get_dino_ducking() { return engine.dino.isDucking; }
EMSCRIPTEN_KEEPALIVE bool get_dino_jumping() { return engine.dino.isJumping; }
EMSCRIPTEN_KEEPALIVE bool get_cactus_active(int i) { return engine.cacti[i].active; }
EMSCRIPTEN_KEEPALIVE float get_cactus_x(int i) { return engine.cacti[i].x; }
EMSCRIPTEN_KEEPALIVE float get_cactus_w(int i) { return engine.cacti[i].width; }
EMSCRIPTEN_KEEPALIVE float get_cactus_h(int i) { return engine.cacti[i].height; }
EMSCRIPTEN_KEEPALIVE int get_cactus_type(int i) { return engine.cacti[i].type; }
EMSCRIPTEN_KEEPALIVE float get_bird_x(int i) { return engine.birds[i].x; }
EMSCRIPTEN_KEEPALIVE float get_bird_y(int i) { return engine.birds[i].y; }
EMSCRIPTEN_KEEPALIVE bool get_bird_active(int i) { return engine.birds[i].active; }

EMSCRIPTEN_KEEPALIVE float get_flappy_x() { return engine.bird.x; }
EMSCRIPTEN_KEEPALIVE float get_flappy_y() { return engine.bird.y; }
EMSCRIPTEN_KEEPALIVE float get_flappy_vy() { return engine.bird.velocityY; }
EMSCRIPTEN_KEEPALIVE bool get_pipe_active(int i) { return engine.pipes[i].active; }
EMSCRIPTEN_KEEPALIVE float get_pipe_x(int i) { return engine.pipes[i].x; }
EMSCRIPTEN_KEEPALIVE float get_pipe_h(int i) { return engine.pipes[i].topHeight; }
EMSCRIPTEN_KEEPALIVE float get_pipe_gap(int i) { return engine.pipes[i].gap; }
