from pyspark.sql import SparkSession

# Bronze layer: ingest raw files via Auto Loader

def read_bronze(spark: SparkSession, input_path: str, checkpoint_path: str):
    """Read streaming data from cloud storage using Auto Loader.
    Args:
        spark: SparkSession
        input_path: root path of raw data (e.g., 's3://my-bucket/raw/')
        checkpoint_path: location for streaming checkpoint
    Returns:
        Streaming DataFrame
    """
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("cloudFiles.schemaLocation", f"{checkpoint_path}/schema")
        .load(input_path)
    )

if __name__ == "__main__":
    spark = SparkSession.builder.appName("ebook_bronze").getOrCreate()
    df = read_bronze(spark, "${input_path}", "${checkpoint_path}")
    # Write to Bronze table (Delta Lake)
    (
        df.writeStream.format("delta")
        .option("checkpointLocation", "${checkpoint_path}")
        .outputMode("append")
        .table("ebook_bronze.raw_events")
    )
    spark.streams.awaitTermination()
