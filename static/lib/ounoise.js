const OUNoise = (function () {
    const NODEJS = typeof module !== 'undefined' && typeof module.exports !== 'undefined';
    if (NODEJS) {
      ({N} = {
        N: require('nial'),        
      });    
    }    
    
    class OUNoise {
      constructor(size, mu=0., theta=0.15, sigma=0.05) {
        this.mu =  N.mul(mu, N.ones([size]));
        this.theta = theta;
        this.sigma = sigma;
        this.reset();
      }
      reset() {
        this.state = N.clone(this.mu);
      }
      sample() {
        const x = this.state;
        const dx = N.add(N.mul(this.theta, N.sub(this.mu, x)),
                   N.mul(this.sigma, N.til(x.length).map(Math.random)));
        this.state = N.add(x, dx)
        return this.state
      }
    }
        
    return OUNoise;
  })();
  
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = OUNoise;
  }