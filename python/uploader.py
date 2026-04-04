import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv
from supabase import Client, create_client


def iso_to_datetime(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def call_model_api(api_url: str, image_path: Path) -> Dict[str, Any]:
    with image_path.open("rb") as f:
        image_bytes = f.read()

    files = {"file": (image_path.name, image_bytes, "image/png")}

    try:
        response = requests.post(api_url, files=files, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception:
        response = requests.post(
            api_url,
            data=image_bytes,
            headers={"Content-Type": "image/png"},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


def upload_image(supabase: Client, bucket_name: str, image_path: Path) -> str:
    object_name = f"csi/{int(time.time())}_{uuid.uuid4().hex}.png"

    with image_path.open("rb") as f:
        supabase.storage.from_(bucket_name).upload(
            path=object_name,
            file=f,
            file_options={"content-type": "image/png", "upsert": "false"},
        )

    return object_name


def save_prediction_row(
    supabase: Client,
    table_name: str,
    image_path: str,
    activity_result: Dict[str, Any],
    presence_result: Dict[str, Any],
) -> None:
    row = {
        "image_path": image_path,
        "activity_result": activity_result,
        "presence_result": presence_result,
    }
    supabase.table(table_name).insert(row).execute()


def list_bucket_objects(supabase: Client, bucket_name: str, limit: int = 100) -> list[dict]:
    objects = supabase.storage.from_(bucket_name).list(
        path="csi",
        options={"limit": limit, "offset": 0, "sortBy": {"column": "name", "order": "desc"}},
    )
    return objects if isinstance(objects, list) else []


def cleanup_old_images(
    supabase: Client,
    bucket_name: str,
    delete_after_seconds: int,
    keep_latest_images: int,
) -> None:
    objects = list_bucket_objects(supabase, bucket_name, limit=200)
    if not objects:
        return

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=delete_after_seconds)

    deletable: list[str] = []

    for index, obj in enumerate(objects):
        if index < keep_latest_images:
            continue

        created_at = iso_to_datetime(obj.get("created_at", ""))
        if created_at and created_at < cutoff:
            name = obj.get("name")
            if name:
                deletable.append(f"csi/{name}")

    if deletable:
        supabase.storage.from_(bucket_name).remove(deletable)
        print(f"Deleted {len(deletable)} old images from bucket")


def iter_images(input_dir: Path) -> list[Path]:
    candidates = []
    for ext in ("*.png", "*.PNG"):
        candidates.extend(input_dir.glob(ext))
    candidates.sort(key=lambda p: p.stat().st_mtime)
    return candidates


def main() -> None:
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    bucket_name = os.getenv("BUCKET_NAME", "csi-images").strip()
    table_name = os.getenv("TABLE_NAME", "csi_predictions").strip()
    input_dir = Path(os.getenv("INPUT_DIR", "./incoming_images")).resolve()
    poll_seconds = int(os.getenv("POLL_SECONDS", "2"))
    delete_after_seconds = int(os.getenv("DELETE_AFTER_SECONDS", "300"))
    keep_latest_images = int(os.getenv("KEEP_LATEST_IMAGES", "1"))
    activity_api_url = os.getenv("ACTIVITY_API_URL", "").strip()
    presence_api_url = os.getenv("PRESENCE_API_URL", "").strip()

    if not supabase_url or not supabase_key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env")
    if not activity_api_url or not presence_api_url:
        raise RuntimeError("Set ACTIVITY_API_URL and PRESENCE_API_URL in .env")

    input_dir.mkdir(parents=True, exist_ok=True)
    supabase = create_client(supabase_url, supabase_key)

    seen: set[str] = set()

    print(f"Watching {input_dir} for PNG files...")
    while True:
        images = iter_images(input_dir)

        for image_path in images:
            key = f"{image_path.name}:{image_path.stat().st_mtime_ns}"
            if key in seen:
                continue

            print(f"Processing {image_path.name}")
            object_path = upload_image(supabase, bucket_name, image_path)

            activity = call_model_api(activity_api_url, image_path)
            presence = call_model_api(presence_api_url, image_path)

            save_prediction_row(
                supabase=supabase,
                table_name=table_name,
                image_path=object_path,
                activity_result=activity,
                presence_result=presence,
            )

            seen.add(key)
            print("Uploaded + saved predictions")

        cleanup_old_images(
            supabase=supabase,
            bucket_name=bucket_name,
            delete_after_seconds=delete_after_seconds,
            keep_latest_images=keep_latest_images,
        )

        time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
