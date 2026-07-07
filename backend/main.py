import uvicorn


def main() -> None:
    """Run the FitMind AI backend with hot reload for local development."""
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
