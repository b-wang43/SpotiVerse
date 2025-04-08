# backend_clustering.py

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import manhattan_distances
from sklearn.cluster import KMeans
from flask_cors import CORS

# --- Configuration ---
# You'll likely need more sophisticated configuration for production
CSV_FILE_PATH = 'C:\Users\hocke\OneDrive\Documents\SpotiVerse\spotiverse\src\backend\dataset.csv'
FEATURES_TO_CLUSTER = [
    'danceability', 'energy', 'loudness', 'speechiness',
    'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo'
]
# Information columns to return with the clustered songs
INFO_COLUMNS = ['track_id', 'artists', 'album_name', 'track_name']

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app)

# --- Data Loading and Preprocessing ---
try:
    print(f"Loading dataset from {CSV_FILE_PATH}...")
    song_data = pd.read_csv(CSV_FILE_PATH)
    # Basic check if required columns exist
    if not all(col in song_data.columns for col in FEATURES_TO_CLUSTER + INFO_COLUMNS):
         raise ValueError("CSV is missing required columns.")
    # Drop rows with missing values in features used for clustering
    song_data = song_data.dropna(subset=FEATURES_TO_CLUSTER)
    print(f"Dataset loaded successfully. Shape: {song_data.shape}")
    # Prepare data for clustering
    print("Scaling features...")
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(song_data[FEATURES_TO_CLUSTER])
    print("Features scaled.")
except FileNotFoundError:
    print(f"ERROR: CSV file not found at {CSV_FILE_PATH}")
    # Exit or handle gracefully if the file is critical
    exit()
except Exception as e:
    print(f"Error loading or processing data: {e}")
    exit()

def run_kmedians(data, k, max_iterations=100):
    print(f"Running K-Medians with k={k}...")
    n_samples, n_features = data.shape

    # 1. Initialize medians randomly from data points
    indices = np.random.choice(n_samples, k, replace=False)
    medians = data[indices]
    print("Initial medians selected.")

    for i in range(max_iterations):
        print(f"K-Medians Iteration {i+1}/{max_iterations}")
        # 2. Assign points to the nearest median (using Manhattan distance)
        distances = manhattan_distances(data, medians)
        labels = np.argmin(distances, axis=1)

        # 3. Update medians: For each cluster, find the point that minimizes
        #    the sum of Manhattan distances to other points in that cluster.
        #    This is computationally intensive! Calculating the true median
        #    in multi-dimensional space often involves approximations or
        #    iterative methods per cluster.
        #    A simpler (but not strictly K-Medians) approach might calculate
        #    the component-wise median for each feature within the cluster.
        new_medians = np.array([np.median(data[labels == j], axis=0) for j in range(k)])

        # Check for convergence (if medians don't change significantly)
        if np.allclose(medians, new_medians, atol=1e-4): # Adjust tolerance as needed
            print("K-Medians converged.")
            break
        medians = new_medians
    else:
         print("K-Medians reached max iterations without converging.")

    print("K-Medians finished.")
    return labels, medians

# --- Suggestion for K ---
# Choosing K requires experimentation. Start with a value, then evaluate.
# Common methods:
# 1. Elbow Method: Plot variance explained (or sum of distances) vs. K. Look for an "elbow".
# 2. Silhouette Score: Measures how similar an object is to its own cluster compared to others.
# A reasonable starting range for song clustering might be K=5 to K=20, depending on dataset size.
# Let's pick a default K for the example, but stress it needs tuning.
DEFAULT_K = 10 # *** TUNE THIS VALUE BASED ON EVALUATION ***

# Run clustering ONCE (or periodically) - Recalculate if data changes significantly
# You might want this triggered differently in production
print("Performing initial clustering...")
cluster_labels, cluster_centers = run_kmedians(scaled_features, k=DEFAULT_K)
song_data['cluster'] = cluster_labels # Add cluster labels to the DataFrame
print(f"Clustering complete. Assigned {len(np.unique(cluster_labels))} clusters.")


# --- API Endpoint ---
@app.route('/cluster_recommendations', methods=['POST'])
def get_cluster_recommendations():
    """
    API endpoint to get songs from the same cluster as the user's profile/songs.
    """
    print("\nReceived request for /cluster_recommendations")
    try:
        user_data = request.get_json()
        if not user_data:
            return jsonify({"error": "Missing request body"}), 400

        # --- Strategy 1: User provides average features ---
        if 'average_features' in user_data and isinstance(user_data['average_features'], list):
            print("Processing based on average features...")
            # Ensure the feature vector matches the order used in training
            if len(user_data['average_features']) != len(FEATURES_TO_CLUSTER):
                 return jsonify({"error": f"Expected {len(FEATURES_TO_CLUSTER)} features"}), 400

            # Scale the user's average features using the *same* scaler
            user_scaled_features = scaler.transform([user_data['average_features']])

            # Find the nearest cluster center (median)
            distances = manhattan_distances(user_scaled_features, cluster_centers)
            user_cluster = np.argmin(distances, axis=1)[0]
            print(f"User features assigned to cluster {user_cluster}")

        else:
            return jsonify({"error": "Invalid request format. Provide 'average_features'."}), 400

        # Get songs from the determined cluster
        cluster_songs = song_data[song_data['cluster'] == user_cluster]

        # Exclude user's input songs if possible? (Needs track IDs)
        # Limit the number of recommendations
        recommendations = cluster_songs.sample(n=min(20, len(cluster_songs))) # Recommend up to 20 songs

        print(f"Returning {len(recommendations)} songs from cluster {user_cluster}.")
        # Return relevant info as JSON
        return jsonify(recommendations[INFO_COLUMNS].to_dict(orient='records'))

    except Exception as e:
        print(f"Error in /cluster_recommendations: {e}")
        # Log the full error traceback in production for debugging
        return jsonify({"error": "An internal error occurred"}), 500

# --- Run the App ---
if __name__ == '__main__':
    # Host 0.0.0.0 makes it accessible on your network (use cautiously)
    # Port 5001 is just an example, ensure it doesn't conflict
    app.run(host='0.0.0.0', port=5001, debug=True) # Turn debug=False for production