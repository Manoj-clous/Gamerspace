#ifndef ENGINE_H
#define ENGINE_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

// General Constants
#define CANVAS_WIDTH 800
#define CANVAS_HEIGHT 400

// Dino Constants
#define DINO_GROUND_Y (CANVAS_HEIGHT - 60)
#define DINO_GRAVITY 0.8f
#define DINO_JUMP_FORCE -15.0f
#define MAX_CACTI 5
#define MAX_BIRDS 2

typedef struct {
    float x, y;
    float velocityY;
    bool isJumping;
    bool isDucking;
    bool hasShield;
    float powerUpTimer;
    int score;
    int highScore;
    bool gameOver;
} DinoState;

typedef struct {
    float x, y;
    float width, height;
    bool active;
    int type; // 0: Small, 1: Large
} Cactus;

typedef struct {
    float x, y;
    float speed;
    bool active;
    int altitude; // 0: low, 1: high
} Bird;

// Flappy Bird Constants
#define BIRD_GRAVITY 0.45f
#define BIRD_LIFT -8.5f
#define INITIAL_PIPE_GAP 160
#define MIN_PIPE_GAP 90
#define PIPE_WIDTH 60
#define MAX_PIPES 5

typedef struct {
    float x, y;
    float velocityY;
    int score;
    int highScore;
    int coins;
    bool gameOver;
} BirdState;

typedef struct {
    float x;
    float topHeight;
    float gap;        // Dynamic gap size
    float moveY;      // For moving pipes
    float moveSpeed;
    bool active;
    bool passed;
} Pipe;

typedef enum {
    GAME_DINO,
    GAME_FLAPPY,
    GAME_NONE
} GameType;

typedef struct {
    GameType activeGame;
    DinoState dino;
    Cactus cacti[MAX_CACTI];
    Bird birds[MAX_BIRDS];
    BirdState bird;
    Pipe pipes[MAX_PIPES];
    float gameTime;    // Total time elapsed in seconds
    int difficulty;    // 0-100 scaling
} GameEngine;

// High Score Persistence Prototypes
void load_high_score(GameType type, int* highScore);
void save_high_score(GameType type, int score);

#endif
