from ntscraper import Nitter

def test_twitter():
    scraper = Nitter(log_level=1, skip_instance_check=False)
    tweets = scraper.get_tweets("danmartell", mode='user', number=5)
    print(tweets)

if __name__ == '__main__':
    test_twitter()
