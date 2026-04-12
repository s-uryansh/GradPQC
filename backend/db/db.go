package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var DB *sql.DB

func InitDB() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	if dbPort == "" {
		dbPort = "3306"
	}
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPass, dbHost, dbPort, dbName)

	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}

	fmt.Println("MySQL Database connected successfully.")
}
