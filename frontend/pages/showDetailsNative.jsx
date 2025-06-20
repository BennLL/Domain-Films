/**
 * ShowDetailsNative Component - Web version using Video.js
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native'; // Using react-native-web for styles & components
import { useNavigation, useRoute } from '@react-navigation/native';
import UserRatingButtons from '../components/userMovieRatingButtons';
import {
  getItems,
  getShowDetails,
  getUserShowByIDS,
  newUserShow,
  setUserShowInfo,
} from './api';
import { addRatings } from '../utils/calcRatings';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const API_URL = process.env.REACT_APP_API_URL;
const ACCESS_TOKEN = process.env.REACT_APP_ACCESS_TOKEN;

const ShowDetailsNative = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const show = route.params?.show;
  const userID = route.params?.userID;

  const [seasons, setSeasons] = useState({});
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [cast, setCast] = useState([]);
  const [showDetails, setShowDetails] = useState(null);
  const [showRating, setShowRating] = useState(null);

  const [userShowID, setUserShowID] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [numWatched, setNumWatched] = useState(0);
  const [timeStamp, setTimeStamp] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const videoNode = useRef(null); // DOM reference to the video element
  const player = useRef(null); // video.js player instance

  // Construct video source URL
  const videoSource = selectedEpisode
    ? `${API_URL}/Videos/${selectedEpisode}/stream?api_key=${ACCESS_TOKEN}&DirectPlay=true&Static=true`
    : null;

  // Initialize video.js player
  useEffect(() => {
    if (videoNode.current) {
      if (player.current) {
        player.current.dispose(); // Dispose previous player instance
      }
      if (videoSource) {
        player.current = videojs(videoNode.current, {
          controls: true,
          fluid: true,
          preload: 'auto',
          loop: true,
          sources: [
            {
              src: videoSource,
              type: 'video/mp4',
            },
          ],
        });

        // Play immediately on load
        player.current.ready(() => {
          player.current.play();
        });

        // Track currentTime for timestamp
        player.current.on('timeupdate', () => {
          setTimeStamp(player.current.currentTime());
        });
      }
    }

    return () => {
      if (player.current) {
        player.current.dispose();
        player.current = null;
      }
    };
  }, [videoSource]);

  // Fetch episodes and show details on mount or show change
  useEffect(() => {
    if (show?.Name) {
      fetchEpisodes(show.Name);
      fetchShowDetails(show.Name);
    }
    handleNewUserShowInfo();
  }, [show]);

  // Functions

  const fetchEpisodes = async (showName) => {
    setLoading(true);
    const allItems = await getItems();
    const filteredItems = allItems.filter((item) => item.SeriesName === showName);

    const seasonMap = {};
    filteredItems.forEach((item) => {
      if (item.Type === 'Episode' && item.ParentIndexNumber) {
        if (!seasonMap[item.ParentIndexNumber]) {
          seasonMap[item.ParentIndexNumber] = {
            seasonName: `Season ${item.ParentIndexNumber}`,
            episodes: [],
          };
        }
        seasonMap[item.ParentIndexNumber].episodes.push(item);
      }
    });

    Object.values(seasonMap).forEach((season) => {
      season.episodes.sort((a, b) => a.IndexNumber - b.IndexNumber);
    });

    setSeasons(seasonMap);
    setSelectedSeason(Object.keys(seasonMap)[0]);
    setLoading(false);
  };

  const fetchShowDetails = async (showName) => {
    try {
      const data = await getShowDetails(showName);
      if (data) {
        setShowDetails(data.showDetails);
        setCast(data.cast);
      }
    } catch (error) {
      console.error('Error fetching show details:', error);
    }
  };

  const handleEpisodeSelect = (episodeId) => {
    setSelectedEpisode(episodeId);
  };

  const handleNewUserShowInfo = async () => {
    if (!userID || !show?.Id) return;

    const rating = await addRatings(show?.Id, 'userShowInfo');
    setShowRating(rating);

    const userShowInfo = await getUserShowByIDS(userID, show.Id);
    if (userShowInfo) {
      setUserShowID(userShowInfo._id);
      setUserRating(userShowInfo.userShowRating);
      setTimeStamp(userShowInfo.timeStamp);
      setIsBookmarked(userShowInfo.isBookmarked);
      setNumWatched(userShowInfo.numWatched);
    } else {
      const response = await newUserShow(userID, show.Id, 0, 0, false, 0);
      if (response?.insertedId) {
        setUserShowID(response.insertedId);
      }
    }
  };

  if (!show)
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>⬅ Go Back</Text>
      </TouchableOpacity>

      {/* Show Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `${API_URL}/Items/${show.Id}/Images/Primary?api_key=${ACCESS_TOKEN}` }}
            style={styles.poster}
            alt="Show Thumbnail"
          />
          <TouchableOpacity
            style={styles.starButton}
            onPress={() => {
              setIsBookmarked(!isBookmarked);
              setUserShowInfo(
                userShowID,
                userID,
                show?.Id,
                numWatched,
                timeStamp,
                !isBookmarked,
                userRating
              );
            }}
          >
            <Text style={[styles.star, isBookmarked ? styles.starSelected : styles.starUnselected]}>
              ★
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{show.Name}</Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Year:</Text> {show.ProductionYear}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Maturity:</Text> {show.OfficialRating || 'Not Rated'}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Community Rating:</Text> {showRating || 'Be the first to Rate!'}{' '}
            {showRating ? '/ 10.00' : ''}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Run Time:</Text> {Math.floor(show.RunTimeTicks / 600000000)} min
          </Text>
        </View>
      </View>

      {/* Seasons and Episodes */}
      <Text style={styles.subtitle}>Seasons:</Text>
      <View style={styles.seasonButtonContainer}>
        {Object.keys(seasons).map((seasonNumber) => (
          <TouchableOpacity
            key={seasonNumber}
            style={[
              styles.seasonButton,
              selectedSeason === seasonNumber && styles.selectedSeasonButton,
            ]}
            onPress={() => setSelectedSeason(seasonNumber)}
          >
            <Text style={styles.seasonButtonText}>{seasons[seasonNumber].seasonName}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedSeason && (
        <View style={styles.episodesContainer}>
          <Text style={styles.subtitle}>{seasons[selectedSeason].seasonName} - Episodes:</Text>
          <FlatList
            data={seasons[selectedSeason].episodes}
            keyExtractor={(item) => item.Id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.episodeItem,
                  selectedEpisode === item.Id && styles.selectedEpisodeItem,
                ]}
                onPress={() => handleEpisodeSelect(item.Id)}
              >
                <Image
                  source={{
                    uri: `${API_URL}/Items/${item.Id}/Images/Primary?api_key=${ACCESS_TOKEN}`,
                  }}
                  style={styles.episodeImage}
                  alt="Episode Thumbnail"
                />
                <Text style={styles.episodeName}>
                  {item.IndexNumber}. {item.Name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Video Player */}
      <Text style={styles.subtitle}>Now Playing:</Text>
      <View style={styles.videoContainer}>
        {selectedEpisode ? (
          <div data-vjs-player>
            <video
              ref={videoNode}
              className="video-js vjs-big-play-centered"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Select an episode to play</Text>
          </View>
        )}
      </View>

      {/* User Rating Buttons */}
      <UserRatingButtons
        defaultRating={userRating}
        onSetRating={(newRating) => {
          setUserRating(newRating);
          if (userShowID && userID && show?.Id) {
            setUserShowInfo(
              userShowID,
              userID,
              show.Id,
              numWatched,
              timeStamp,
              isBookmarked,
              newRating
            );
          }
        }}
      />

      {/* Additional Show Details */}
      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
      ) : showDetails ? (
        <View style={styles.tmdbContainer}>
          <Text style={styles.subtitle}>More Info from TMDb:</Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Overview:</Text> {showDetails.overview}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>TMDb Rating:</Text> {showDetails.vote_average}/10
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.bold}>Release Date:</Text> {showDetails.release_date}
          </Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>No Additional Info</Text>
      )}

      {/* Cast Information */}
      {cast.length > 0 && (
        <View style={styles.castContainer}>
          <Text style={styles.subtitle}>Cast:</Text>
          <FlatList
            data={cast}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.castItem}>
                <Image
                  source={{
                    uri: item.profile_path
                      ? `https://image.tmdb.org/t/p/w500/${item.profile_path}`
                      : 'https://via.placeholder.com/500x750?text=No+Image',
                  }}
                  style={styles.castImage}
                  alt="Cast Thumbnail"
                />
                <Text style={styles.castName}>{item.name}</Text>
                <Text style={styles.castCharacter}>{item.character}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  backButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 10,
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  detail: {
    fontSize: 16,
    color: '#D3D3D3',
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  seasonButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 15,
    width: '100%',
  },
  seasonButton: {
    padding: 10,
    backgroundColor: '#333',
    margin: 5,
    borderRadius: 5,
  },
  selectedSeasonButton: {
    backgroundColor: '#FF4500',
  },
  seasonButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  episodesContainer: {
    width: '100%',
    marginBottom: 20,
  },
  episodeItem: {
    width: 250,
    margin: 10,
    alignItems: 'center',
  },
  selectedEpisodeItem: {
    borderColor: '#FF4500',
  },
  episodeImage: {
    width: '100%',
    height: 150,
    borderRadius: 5,
    marginBottom: 5,
  },
  episodeName: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  videoContainer: {
    width: '60%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 18,
  },
  starButton: {
    position: 'absolute',
    top: 5,
    right: 20,
  },
  star: {
    fontSize: 40,
  },
  starSelected: {
    color: '#FFD700',
  },
  starUnselected: {
    color: '#555',
  },
  tmdbContainer: {
    width: '100%',
    marginTop: 15,
  },
  castContainer: {
    marginTop: 20,
    width: '100%',
  },
  castItem: {
    marginRight: 10,
    width: 120,
    alignItems: 'center',
  },
  castImage: {
    width: 120,
    height: 180,
    borderRadius: 5,
    marginBottom: 5,
  },
  castName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  castCharacter: {
    color: '#ccc',
    textAlign: 'center',
  },
});

export default ShowDetailsNative;
