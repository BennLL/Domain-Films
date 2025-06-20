import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import {
  getMovieDetails,
  getUserMovieByIDS,
  newUserMovie,
  setUserMovieInfo,
} from './api';
import UserRatingButtons from '../components/userMovieRatingButtons';
import { addRatings } from '../utils/calcRatings';

const API_URL = process.env.REACT_APP_API_URL;
const ACCESS_TOKEN = process.env.REACT_APP_ACCESS_TOKEN;

const MediaDetailsNative = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const media = route.params?.media;
  const userID = route.params?.userID;

  const videoRef = useRef(null);
  const [videoPlayer, setVideoPlayer] = useState(null);
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState([]);
  const [timeStamp, setTimeStamp] = useState(0);
  const [isBookmarked, setBookmarked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [movieRating, setMovieRating] = useState(null);
  const [userMovieID, setUserMovieID] = useState(null);
  const [numWatched, setNumWatched] = useState(0);

  useEffect(() => {
    if (media?.Name) {
      fetchMovieInfo(media.Name);
    }
  }, [media]);

  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        sources: [
          {
            src: `${API_URL}/Videos/${media.Id}/stream?api_key=${ACCESS_TOKEN}&DirectPlay=true&Static=true`,
            type: 'video/mp4',
          },
        ],
      });

      player.on('pause', () => {
        if (player.currentTime()) {
          setTimeStamp(player.currentTime());
          handlePause(player.currentTime());
        }
      });

      setVideoPlayer(player);

      return () => {
        if (player) player.dispose();
      };
    }
  }, [videoRef, media]);

  const fetchMovieInfo = async (movieName) => {
    const data = await getMovieDetails(movieName);
    if (data) {
      setMovieData(data.movieDetails);
      setCast(data.cast);
    }
    setLoading(false);
  };

  const handleNewUserMovieInfo = async () => {
    const rating = await addRatings(media.Id, 'userMovieInfo');
    setMovieRating(rating);
    const userMovieInfo = await getUserMovieByIDS(userID, media.Id);
    if (userMovieInfo) {
      setUserMovieID(userMovieInfo._id);
      setBookmarked(userMovieInfo.isBookmarked);
      setUserRating(userMovieInfo.userMovieRating);
      setTimeStamp(userMovieInfo.timeStamp);
      setNumWatched(userMovieInfo.numWatched);
    } else {
      const response = await newUserMovie(userID, media.Id, 0, 0, false, 0);
      setUserMovieID(response.insertedId);
    }
  };

  useEffect(() => {
    handleNewUserMovieInfo();
  }, []);

  const handlePause = async (currentTime) => {
    if (!userMovieID) return;
    await setUserMovieInfo(
      userMovieID,
      userID,
      media.Id,
      numWatched,
      currentTime,
      isBookmarked,
      userRating
    );
  };

  if (!media) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>⬅ Go Back</Text>
      </TouchableOpacity>

      <View style={styles.detailsContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `${API_URL}/Items/${media.Id}/Images/Primary?api_key=${ACCESS_TOKEN}` }}
            style={styles.poster}
          />
          <TouchableOpacity
            style={styles.starButton}
            onPress={() => {
              setBookmarked(!isBookmarked);
              setUserMovieInfo(
                userMovieID,
                userID,
                media.Id,
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
          <Text style={styles.title}>{media.Name}</Text>
          <Text style={styles.detail}><Text style={styles.bold}>Year:</Text> {media.ProductionYear}</Text>
          <Text style={styles.detail}><Text style={styles.bold}>Maturity:</Text> {media.OfficialRating || 'Not Rated'}</Text>
          <Text style={styles.detail}><Text style={styles.bold}>Community Rating:</Text> {movieRating || 'Be the first to Rate!'} {movieRating ? '/ 10.00' : ''}</Text>
          <Text style={styles.detail}><Text style={styles.bold}>Container:</Text> {media.Container || 'Unknown'}</Text>
          <Text style={styles.detail}><Text style={styles.bold}>Run Time:</Text> {Math.floor(media.RunTimeTicks / 600000000)} min</Text>
        </View>
      </View>

      {Platform.OS === 'web' && (
        <>
          <Text style={styles.subtitle}>Now Playing:</Text>
          <div data-vjs-player style={styles.videoContainer}>
            <video ref={videoRef} className="video-js vjs-default-skin" ></video>
          </div>
        </>
      )}

      <UserRatingButtons
        userID={userID}
        mediaID={media.Id}
        defaultRating={userRating}
        onSetRating={(newRating) => {
          setUserRating(newRating);
          setUserMovieInfo(userMovieID, userID, media.Id, numWatched, timeStamp, isBookmarked, newRating);
        }}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
      ) : (
        movieData && (
          <View style={styles.tmdbContainer}>
            <Text style={styles.subtitle}>More Info from TMDb:</Text>
            <Text style={styles.detail}><Text style={styles.bold}>Overview:</Text> {movieData.overview}</Text>
            <Text style={styles.detail}><Text style={styles.bold}>TMDb Rating:</Text> {movieData.vote_average}/10</Text>
            <Text style={styles.detail}><Text style={styles.bold}>Release Date:</Text> {movieData.release_date}</Text>
          </View>
        )
      )}

      {cast.length > 0 && (
        <View style={styles.castContainer}>
          <Text style={styles.subtitle}>Cast:</Text>
          <FlatList
            data={cast}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.castItem}>
                <Image source={{ uri: `https://image.tmdb.org/t/p/w500/${item.profile_path}` }} style={styles.castImage} />
                <Text style={styles.castName}>{item.name}</Text>
                <Text style={styles.castCharacter}>{item.character}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
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
  imageContainer: {
    position: 'relative',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 10,
    marginRight: 15,
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
    color: 'black',
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
  },
  videoPlayer: {
    width: '60%',
    height: 500,
    borderRadius: 10,
  },
  videoContainer: {
    width: '60%',
    height: 500,
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    marginVertical: 10,
  },
  videoContainerMobile: {
    width: '60%',
    height: 200,
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    marginVertical: 10,
  },
  controlsContainer: {
    padding: 10,
  },
  tmdbContainer: {
    marginTop: 20,
    width: '100%',
  },
  castContainer: {
    marginTop: 20,
    width: '100%',
  },
  castItem: {
    marginRight: 10,
    alignItems: 'center',
    width: 120,
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
    textAlign: 'center',
    width: '100%',
  },
  castCharacter: {
    color: '#D3D3D3',
    textAlign: 'center',
  },
});

export default MediaDetailsNative;
