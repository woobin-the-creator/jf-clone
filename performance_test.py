#!/usr/bin/env python3
"""
Performance Test Script for What's New Optimization
"""
import time
import requests
import statistics
from typing import List, Dict

# 설정
BASE_URL = "http://localhost:8000"
TEST_ITERATIONS = 10

def measure_endpoint(endpoint: str, name: str) -> Dict[str, float]:
    """엔드포인트 성능 측정"""
    times = []
    sizes = []

    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"Endpoint: {endpoint}")
    print(f"{'='*60}")

    for i in range(TEST_ITERATIONS):
        start = time.time()
        response = requests.get(f"{BASE_URL}{endpoint}")
        end = time.time()

        elapsed = (end - start) * 1000  # ms
        size = len(response.content) / 1024 / 1024  # MB

        times.append(elapsed)
        sizes.append(size)

        print(f"Run {i+1:2d}: {elapsed:6.1f}ms | {size:5.2f}MB")

    return {
        'avg_time': statistics.mean(times),
        'min_time': min(times),
        'max_time': max(times),
        'median_time': statistics.median(times),
        'avg_size': statistics.mean(sizes),
    }

def main():
    print("\n" + "="*60)
    print("PERFORMANCE TEST - What's New Optimization")
    print("="*60)

    # 1. 목록 조회 (Light Serializer)
    list_result = measure_endpoint(
        "/api/request-submissions?page=1&page_size=1000",
        "List API (Light Serializer)"
    )

    # 2. 상세 조회 (Full Serializer) - 첫 번째 항목
    detail_result = measure_endpoint(
        "/api/request-submissions/1",
        "Detail API (Full Serializer)"
    )

    # 결과 요약
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    print(f"\n📊 List API (Light Serializer):")
    print(f"  - Average: {list_result['avg_time']:.1f}ms")
    print(f"  - Median:  {list_result['median_time']:.1f}ms")
    print(f"  - Min:     {list_result['min_time']:.1f}ms")
    print(f"  - Max:     {list_result['max_time']:.1f}ms")
    print(f"  - Size:    {list_result['avg_size']:.2f}MB")

    print(f"\n📊 Detail API (Full Serializer):")
    print(f"  - Average: {detail_result['avg_time']:.1f}ms")
    print(f"  - Median:  {detail_result['median_time']:.1f}ms")
    print(f"  - Min:     {detail_result['min_time']:.1f}ms")
    print(f"  - Max:     {detail_result['max_time']:.1f}ms")
    print(f"  - Size:    {detail_result['avg_size']:.2f}MB")

    print("\n" + "="*60)
    print("✅ Test Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
